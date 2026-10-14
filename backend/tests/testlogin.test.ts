import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import { createSentence, createUser, tokenFromLogin } from "./helpers.js";

// A secret long enough for the test login door to agree to open
const SECRET = "a-long-random-test-login-secret-0123456789";

// Each test chooses its own settings; restore the real ones afterwards
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /auth/test (test-only login, for automated browser tests on staging)", () => {
  describe("when the door is open (staging)", () => {
    beforeEach(() => {
      vi.stubEnv("TEST_LOGIN_SECRET", SECRET);
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");
    });

    it("logs in as the test student and sets the same session cookie a Google login does", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student" });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ firstName: "Test", isAdmin: false });
      expect(res.body.token).toBeUndefined(); // never in the body
      expect(res.headers["set-cookie"][0]).toMatch(/^session=.*HttpOnly/);

      // The cookie works on a page that needs a login
      const mypage = await request(app)
        .get("/MyPage")
        .set("Cookie", `session=${tokenFromLogin(res)}`);
      expect(mypage.status).toBe(200);
    });

    it("logs in as the test admin, who can open the admin page", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.user.isAdmin).toBe(true);
      const adminPage = await request(app)
        .get("/Admin")
        .set("Cookie", `session=${tokenFromLogin(res)}`);
      expect(adminPage.status).toBe(200);
    });

    it("reuses the same test account on every login instead of creating new ones", async () => {
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });

      expect(await Profile.countDocuments({ id: "test-student" })).toBe(1);
    });

    it("with fresh: true, deletes the test account's sentences so it starts over at Day 1", async () => {
      const first = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student" });
      const student = await Profile.findOne({ id: "test-student" });
      const sentence = await createSentence(student);
      student.ownSentences.push(sentence._id);
      await student.save();

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student", fresh: true });

      expect(first.status).toBe(200);
      expect(res.status).toBe(200);
      expect(await Sentence.countDocuments({ GID: "test-student" })).toBe(0);
      expect(res.body.user.ownSentences).toEqual([]);
      // MyPage (which counts the sentences to pick the day) now sees none
      const mypage = await request(app)
        .get("/MyPage")
        .set("Cookie", `session=${tokenFromLogin(res)}`);
      expect(mypage.body).toEqual([]);
    });

    it("with fresh: true, never touches anyone else's sentences", async () => {
      const ada = await createUser();
      await createSentence(ada);

      await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student", fresh: true });

      expect(await Sentence.countDocuments({ GID: ada.id })).toBe(1);
    });

    it("without fresh, keeps the test account's sentences", async () => {
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });
      const student = await Profile.findOne({ id: "test-student" });
      await createSentence(student);

      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });

      expect(await Sentence.countDocuments({ GID: "test-student" })).toBe(1);
    });

    it("refuses fresh: true with a wrong secret, deleting nothing", async () => {
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });
      const student = await Profile.findOne({ id: "test-student" });
      await createSentence(student);

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "wrong", role: "student", fresh: true });

      expect(res.status).toBe(401);
      expect(await Sentence.countDocuments({ GID: "test-student" })).toBe(1);
    });

    it("refuses a wrong secret", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "wrong", role: "student" });

      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("refuses a missing secret or body", async () => {
      const res = await request(app).post("/auth/test");
      expect(res.status).toBe(401);
    });

    it("refuses an unknown role", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "superuser" });
      expect(res.status).toBe(400);
    });

    it("refuses built-in object names as roles", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "toString" });
      expect(res.status).toBe(400);
    });

    it("gives each student role its own account, shown as Test Student", async () => {
      for (const [role, id] of [
        ["student", "test-student"],
        ["student-approve", "test-student-approve"],
        ["student-redo", "test-student-redo"],
        ["student-withdraw", "test-student-withdraw"],
        ["student-pagination", "test-student-pagination"],
        ["student-sort", "test-student-sort"],
        ["student-double-submit", "test-student-double-submit"],
        ["student-mobile", "test-student-mobile"],
      ]) {
        const res = await request(app).post("/auth/test").send({ secret: SECRET, role });

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({
          id,
          email: `${id}@showme.test`,
          firstName: "Test",
          lastName: "Student",
          isAdmin: false,
        });
      }
    });

    it("with fresh: true, only wipes the sentences of the student role that asked", async () => {
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });
      const student = await Profile.findOne({ id: "test-student" });
      await createSentence(student);

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student-approve", fresh: true });

      expect(res.status).toBe(200);
      expect(await Sentence.countDocuments({ GID: "test-student" })).toBe(1);
    });
  });

  describe("when the door must stay shut", () => {
    it("doesn't exist when no secret is configured (production never gets one)", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", "");
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "", role: "student" });
      expect(res.status).toBe(404);
    });

    it("stays shut on the production project even if a secret is set by mistake", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", SECRET);
      vi.stubEnv("GCLOUD_PROJECT", "showme-backend-789");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "admin" });
      expect(res.status).toBe(404);
    });

    it("stays shut when the secret is too short to be safe", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", "short");
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "short", role: "admin" });
      expect(res.status).toBe(404);
    });
  });
});
