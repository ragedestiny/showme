import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import app from "../app.js";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import { createSentence, createUser, sessionCookie } from "./helpers.js";

const otherUser = () =>
  createUser({ id: "google-user-2", firstName: "Alan", email: "alan@example.com" });

describe("/MyPage requires a valid token", () => {
  it.each([
    ["get", "/MyPage"],
    ["post", "/MyPage"],
    ["patch", "/MyPage"],
  ])("%s %s without a token returns 401", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("GET /MyPage", () => {
  it("returns only the signed-in user's sentences", async () => {
    const ada = await createUser();
    const alan = await otherUser();
    await createSentence(ada, { show: "Ada's sentence" });
    await createSentence(alan, { show: "Alan's sentence" });

    const res = await request(app).get("/MyPage").set("Cookie", sessionCookie(ada));

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.show)).toEqual(["Ada's sentence"]);
  });
});

describe("POST /MyPage", () => {
  it("creates a sentence and links it to the user's profile", async () => {
    const ada = await createUser();

    const res = await request(app)
      .post("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({
        title: "Day 1",
        tell: "It is cold outside.",
        show: "Frost bit my fingers.",
        author: ada._id,
        GID: ada.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.show).toBe("Frost bit my fingers.");
    const profile = await Profile.findById(ada._id);
    expect(profile.ownSentences.map(String)).toEqual([res.body._id]);
  });

  it("ignores GID/author in the body and credits the signed-in user", async () => {
    const ada = await createUser();
    const alan = await otherUser();

    // Ada is signed in, but claims to be Alan in the body.
    const res = await request(app)
      .post("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({
        title: "Day 1",
        tell: "It is cold outside.",
        show: "Written by Ada, claiming to be Alan",
        author: alan._id,
        GID: alan.id,
      });

    expect(res.status).toBe(201);
    const saved = await Sentence.findById(res.body._id);
    expect(saved.GID).toBe(ada.id);
    expect(String(saved.author)).toBe(String(ada._id));
    const adaProfile = await Profile.findById(ada._id);
    const alanProfile = await Profile.findById(alan._id);
    expect(adaProfile.ownSentences.map(String)).toContain(res.body._id);
    expect(alanProfile.ownSentences).toHaveLength(0);
  });

  it("works without GID/author in the body at all", async () => {
    const ada = await createUser();

    const res = await request(app)
      .post("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({ title: "Day 1", tell: "It is cold outside.", show: "Brr." });

    expect(res.status).toBe(201);
    expect(res.body.GID).toBe(ada.id);
  });

  it.each([["   "], ["\n"], [" \n\t "], [""], [undefined], [42]])(
    "refuses a blank or non-text show sentence (%j) and saves nothing",
    async (show) => {
      const ada = await createUser();

      const res = await request(app)
        .post("/MyPage")
        .set("Cookie", sessionCookie(ada))
        .send({ title: "Day 1", tell: "It is cold outside.", show });

      expect(res.status).toBe(400);
      expect(await Sentence.countDocuments({ GID: ada.id })).toBe(0);
      const profile = await Profile.findById(ada._id);
      expect(profile.ownSentences).toEqual([]);
    }
  );
});

describe("request size limit", () => {
  it("refuses request bodies over 1mb (413 Payload Too Large)", async () => {
    const ada = await createUser();

    // The server answers 413 from the size label (Content-Length) without
    // reading the body, then closes the connection. If the client is still
    // uploading at that moment, it can see the connection cut (ECONNRESET)
    // before it reads the 413. Both mean "refused"; what matters is that
    // nothing was saved.
    let outcome;
    try {
      const res = await request(app)
        .post("/MyPage")
        .set("Cookie", sessionCookie(ada))
        .send({ title: "Day 1", tell: "x", show: "x".repeat(1024 * 1024 + 1) });
      outcome = res.status;
    } catch (error) {
      outcome = error.code;
    }

    expect([413, "ECONNRESET", "EPIPE"]).toContain(outcome);
    expect(await Sentence.countDocuments()).toBe(0);
  });

  it("refuses them even when Firebase has already read the body (as in production)", async () => {
    // On Cloud Functions, Firebase parses the body before our app runs, so
    // express.json() skips its own size check. Copy that with an outer app
    // that reads the body first, with a far bigger limit, then hands over.
    const pretendFirebase = express();
    pretendFirebase.use(express.json({ limit: "50mb" }));
    pretendFirebase.use(app);
    const ada = await createUser();

    const res = await request(pretendFirebase)
      .post("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({ title: "Day 1", tell: "x", show: "x".repeat(2 * 1024 * 1024) });

    expect(res.status).toBe(413);
    expect(await Sentence.countDocuments()).toBe(0);
  });
});

describe("PATCH /MyPage", () => {
  it("replaces the user's sentence with that title and sends it back for review", async () => {
    const ada = await createUser();
    await createSentence(ada, { title: "Day 1", approved: true, toRedo: true });

    const res = await request(app)
      .patch("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({ title: "Day 1", show: "A better sentence." });

    expect(res.status).toBe(201);
    expect(res.body.show).toBe("A better sentence.");
    expect(res.body.approved).toBe(false);
    expect(res.body.toRedo).toBe(false);
  });

  it("can't edit another user's sentence (404)", async () => {
    const ada = await createUser();
    const alan = await otherUser();
    await createSentence(alan, { title: "Day 1" });

    const res = await request(app)
      .patch("/MyPage")
      .set("Cookie", sessionCookie(ada))
      .send({ title: "Day 1", show: "Hijacked" });

    expect(res.status).toBe(404);
  });

  it.each([["   "], ["\n"], [""], [undefined]])(
    "refuses to blank out a sentence (%j) and leaves it unchanged",
    async (show) => {
      const ada = await createUser();
      await createSentence(ada, { title: "Day 1", show: "Keep me.", approved: true });

      const res = await request(app)
        .patch("/MyPage")
        .set("Cookie", sessionCookie(ada))
        .send({ title: "Day 1", show });

      expect(res.status).toBe(400);
      const saved = await Sentence.findOne({ GID: ada.id, title: "Day 1" });
      expect(saved.show).toBe("Keep me.");
      expect(saved.approved).toBe(true);
    }
  );

  // A title that's a database instruction instead of text, like {"$gt": ""}
  // ("any title"), must not pick out a sentence the student didn't name.
  it.each([[{ $gt: "" }], [{ $ne: null }], [["Day 1"]], [undefined]])(
    "refuses a title that isn't text (%j) and changes nothing",
    async (title) => {
      const ada = await createUser();
      await createSentence(ada, { title: "Day 1", show: "Keep me." });

      const res = await request(app)
        .patch("/MyPage")
        .set("Cookie", sessionCookie(ada))
        .send({ title, show: "Overwritten" });

      expect(res.status).toBe(400);
      const saved = await Sentence.findOne({ GID: ada.id, title: "Day 1" });
      expect(saved.show).toBe("Keep me.");
    }
  );
});

describe("default timestamps", () => {
  const pause = () => new Promise((r) => setTimeout(r, 20));

  it("stamps each sentence with the time it was created", async () => {
    const ada = await createUser();
    const first = await createSentence(ada, { title: "a", createdAt: undefined });
    await pause();
    const second = await createSentence(ada, { title: "b", createdAt: undefined });

    expect(second.createdAt.getTime()).toBeGreaterThan(first.createdAt.getTime());
  });

  it("stamps each profile with the time the user joined", async () => {
    const ada = await createUser({ dateJoined: undefined });
    await pause();
    const alan = await otherUser();

    expect(alan.dateJoined.getTime()).toBeGreaterThan(ada.dateJoined.getTime());
  });
});
