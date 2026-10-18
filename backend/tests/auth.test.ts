import { beforeEach, describe, expect, it, vi } from "vitest";
import request, { type Response } from "supertest";
import jwt from "jsonwebtoken";
import { logger } from "firebase-functions/logger";
import app from "../app.js";
import { jwtSecret } from "../config/session.js";
import Profile from "../models/profile.js";
import {
  createSentence,
  createUser,
  logLineFor,
  sessionCookie,
  tokenFor,
  tokenFromLogin,
} from "./helpers.js";

// We never call Google in tests. vi.mock swaps the real google-auth-library
// for a fake whose verifyIdToken we control. vi.hoisted makes the fake
// function exist before vi.mock runs (vi.mock is moved to the top of the file).
const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken(...args: unknown[]) {
      return verifyIdToken(...args);
    }
  },
}));

// What a verified Google ID token's payload looks like.
const googlePayload = {
  sub: "google-new-user",
  given_name: "linus",
  family_name: "torvalds",
  email: "linus@example.com",
};

// What's inside one of our login tokens. jsonwebtoken can't know; ours always
// hold the Google id and when they were signed (iat) and expire (exp).
interface TokenContents {
  id: string;
  v?: number;
  iat: number;
  exp: number;
}
const decode = (token: string) =>
  jwt.verify(token, jwtSecret()) as TokenContents;

beforeEach(() => {
  verifyIdToken.mockReset();
  verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
});

describe("POST /auth (exchange a Google ID token for our JWT)", () => {
  it("verifies the Google token against our client id", async () => {
    await request(app).post("/auth").send({ token: "google-id-token" });

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: "test-google-client-id",
    });
  });

  it("creates a profile on first login, capitalising the names", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(200);
    const saved = await Profile.findOne({ id: "google-new-user" }).orFail();
    expect(saved.firstName).toBe("Linus");
    expect(saved.lastName).toBe("Torvalds");
    expect(saved.email).toBe("linus@example.com");
    expect(res.body.user.id).toBe("google-new-user");
  });

  // Exactly the contract's fields: no login details (tokenVersion), no
  // database bookkeeping (_id, __v), no lists of sentences
  it("sends back the profile as the contract lists it, and nothing else", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.body).toStrictEqual({
      user: {
        id: "google-new-user",
        firstName: "Linus",
        lastName: "Torvalds",
        email: "linus@example.com",
        isAdmin: false,
      },
    });
  });

  // Google doesn't always send a first name (given_name is optional in its
  // tokens). Such a student must still be able to log in. The stand-in is
  // "Student", never part of their email, because the name shows on
  // Collections, which anyone can see.
  it.each([
    ["no first name", {}],
    ["an empty first name", { given_name: "" }],
  ])("lets an account with %s log in, as \"Student\"", async (_, names) => {
    const { given_name, ...rest } = googlePayload;
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ ...rest, ...names }) });

    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(200);
    const saved = await Profile.findOne({ id: "google-new-user" }).orFail();
    expect(saved.firstName).toBe("Student");
    expect(saved.lastName).toBe("Torvalds");
  });

  it("reuses the existing profile on later logins", async () => {
    await request(app).post("/auth").send({ token: "t" });
    await request(app).post("/auth").send({ token: "t" });

    expect(await Profile.countDocuments({ id: "google-new-user" })).toBe(1);
  });

  it("returns a JWT holding the Google id that expires after 1 hour", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    const decoded = decode(tokenFromLogin(res));
    expect(decoded.id).toBe("google-new-user");
    expect(decoded.exp - decoded.iat).toBe(60 * 60);
  });

  it("keeps the token out of the response body, where page scripts could read it", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(tokenFromLogin(res));
    expect(res.body.user.id).toBe("google-new-user");
  });

  it("sets the token in an httpOnly, Secure, SameSite=Lax session cookie", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    const cookie = res.get("Set-Cookie")?.find((c) => c.startsWith("session="));
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("makes the cookie last exactly as long as the token inside it", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    const cookie = res.get("Set-Cookie")?.find((c) => c.startsWith("session="));
    const { iat, exp } = decode(tokenFromLogin(res));
    expect(cookie).toContain(`Max-Age=${exp - iat}`);
  });

  it("doesn't set a cookie when the Google token is rejected", async () => {
    verifyIdToken.mockRejectedValue(new Error("Invalid token signature"));

    const res = await request(app).post("/auth").send({ token: "forged" });

    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects a login request with no body with 401, without asking Google", async () => {
    const res = await request(app).post("/auth");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid Google token");
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  // A token is text (see contract/api.ts); anything else isn't sent to Google
  it.each([[{ token: 12345 }], [{ token: { forged: true } }], [{ token: "" }]])(
    "rejects a token that isn't text (%j) with 401, without asking Google",
    async (body) => {
      const res = await request(app).post("/auth").send(body);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid Google token");
      expect(verifyIdToken).not.toHaveBeenCalled();
    }
  );

  it("rejects a Google token that fails verification with 401", async () => {
    verifyIdToken.mockRejectedValue(new Error("Invalid token signature"));

    const res = await request(app).post("/auth").send({ token: "forged" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid Google token");
    expect(await Profile.countDocuments()).toBe(0);
  });

  // Google's tokens always say which account (sub) and its email, but its
  // types don't promise them, so the server checks rather than crash
  it.each([
    ["no payload", undefined],
    ["no account id", { ...googlePayload, sub: undefined }],
    ["no email", { ...googlePayload, email: undefined }],
  ])("rejects a verified token with %s (401)", async (_, payload) => {
    verifyIdToken.mockResolvedValue({ getPayload: () => payload });

    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid Google token");
    expect(await Profile.countDocuments()).toBe(0);
  });

  it("logs a rejected Google token as a normal 401, without Google's message", async () => {
    // Google's error messages can contain the whole token
    verifyIdToken.mockRejectedValue(
      new Error("Wrong number of segments in token: forged-token-text")
    );
    vi.mocked(logger.write).mockClear();

    await request(app).post("/auth").send({ token: "forged-token-text" });

    const line = await logLineFor("/auth");
    expect(line).toMatchObject({ severity: "INFO", status: 401 });
    expect(JSON.stringify(line)).not.toContain("forged-token-text");
  });

  it("still returns 500 when something on our side breaks", async () => {
    // The Google token is fine, but saving the new profile fails.
    vi.spyOn(Profile.prototype, "save").mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Google authentication failed");
  });
});

// The auth middleware guards every private route. GET /Login is the simplest
// one, so we use it to exercise the middleware.
describe("auth middleware (via GET /Login)", () => {
  it("rejects a request with no session cookie", async () => {
    const res = await request(app).get("/Login");
    expect(res.status).toBe(401);
  });

  it("rejects a session cookie that isn't a JWT", async () => {
    const res = await request(app).get("/Login").set("Cookie", "session=not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("rejects an expired session cookie", async () => {
    const user = await createUser();
    const expired = tokenFor(user, { expiresIn: -10 });
    const res = await request(app).get("/Login").set("Cookie", `session=${expired}`);
    expect(res.status).toBe(401);
  });

  it("no longer accepts a valid token in an Authorization header", async () => {
    const user = await createUser();
    const res = await request(app)
      .get("/Login")
      .set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(401);
  });

  // The profile only, as the contract lists it: the student's sentences come
  // from GET /MyPage, and login details (tokenVersion) never leave the server
  it("accepts a valid token and returns the user, as the contract lists it", async () => {
    const user = await createUser();
    const sentence = await createSentence(user);
    await Profile.updateOne(
      { _id: user._id },
      { $push: { ownSentences: sentence._id } }
    );

    const res = await request(app).get("/Login").set("Cookie", sessionCookie(user));

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({
      id: "google-user-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      isAdmin: false,
    });
  });

  it("accepts a valid session cookie", async () => {
    const user = await createUser();

    const res = await request(app).get("/Login").set("Cookie", sessionCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ada@example.com");
  });

  it("rejects a forged session cookie", async () => {
    const forged = jwt.sign({ id: "google-user-1" }, "attacker-secret");

    const res = await request(app).get("/Login").set("Cookie", `session=${forged}`);

    expect(res.status).toBe(401);
  });

  it("rejects a valid token whose user no longer exists (401)", async () => {
    const user = await createUser();
    const cookie = sessionCookie(user);
    await Profile.deleteOne({ _id: user._id });

    const res = await request(app).get("/Login").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

describe("POST /Logout", () => {
  // A cookie is deleted by sending it again with an expiry date in the past.
  const clearsSessionCookie = (res: Response) =>
    res.get("Set-Cookie")?.some(
      (c) => c.startsWith("session=;") && c.includes("Expires=Thu, 01 Jan 1970")
    );

  it("tells the browser to delete the session cookie", async () => {
    const user = await createUser();

    const res = await request(app).post("/Logout").set("Cookie", sessionCookie(user));

    expect(res.status).toBe(200);
    expect(clearsSessionCookie(res)).toBe(true);
  });

  it("cancels the token, so a copied cookie stops working", async () => {
    const user = await createUser();
    const copiedCookie = sessionCookie(user);

    await request(app).post("/Logout").set("Cookie", copiedCookie);
    const res = await request(app).get("/Login").set("Cookie", copiedCookie);

    expect(res.status).toBe(401);
  });

  it("logs the user out on every device", async () => {
    const user = await createUser();
    const laptop = sessionCookie(user);
    const phone = sessionCookie(user);

    await request(app).post("/Logout").set("Cookie", phone);
    const res = await request(app).get("/Login").set("Cookie", laptop);

    expect(res.status).toBe(401);
  });

  it("lets the user log in again afterwards with a fresh token", async () => {
    const user = await createUser();
    await request(app).post("/Logout").set("Cookie", sessionCookie(user));

    const fresh = await Profile.findById(user._id).orFail(); // now on version 1
    const res = await request(app).get("/Login").set("Cookie", sessionCookie(fresh));

    expect(res.status).toBe(200);
  });

  it("still succeeds and clears the cookie with no token or an expired one", async () => {
    const user = await createUser();
    const expired = `session=${tokenFor(user, { expiresIn: -10 })}`;

    const none = await request(app).post("/Logout");
    const old = await request(app).post("/Logout").set("Cookie", expired);

    expect(none.status).toBe(200);
    expect(clearsSessionCookie(none)).toBe(true);
    expect(old.status).toBe(200);
    expect(clearsSessionCookie(old)).toBe(true);
  });
});

describe("token version", () => {
  it("puts the user's current token version in the token at login", async () => {
    await createUser({ id: "google-new-user", email: "x@example.com", tokenVersion: 3 });

    const res = await request(app).post("/auth").send({ token: "t" });

    const decoded = decode(tokenFromLogin(res));
    expect(decoded.v).toBe(3);
  });

  it("still accepts tokens issued before versions existed (no v), for users still on version 0", async () => {
    const user = await createUser();
    const legacy = jwt.sign({ id: user.id }, jwtSecret(), { expiresIn: "1h" });

    const res = await request(app).get("/Login").set("Cookie", `session=${legacy}`);

    expect(res.status).toBe(200);
  });
});
