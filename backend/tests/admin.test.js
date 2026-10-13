import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import { Sentence } from "../models/sentences.js";
import { createAdmin, createSentence, createUser, sessionCookie } from "./helpers.js";

describe("/Admin access control", () => {
  it.each(["get", "patch"])("%s without a token returns 401", async (method) => {
    const res = await request(app)[method]("/Admin");
    expect(res.status).toBe(401);
  });

  it.each(["get", "patch"])("%s as a non-admin returns 403", async (method) => {
    const user = await createUser();
    const res = await request(app)[method]("/Admin").set("Cookie", sessionCookie(user));
    expect(res.status).toBe(403);
  });
});

describe("requests with no body", () => {
  // Express 5 leaves req.body undefined when there's no body. A signed-in
  // request without one must get a normal error, never a 500 crash.
  it.each([
    ["post", "/MyPage"],
    ["patch", "/MyPage"],
    ["patch", "/Admin"],
  ])("%s %s without a body doesn't crash", async (method, path) => {
    const admin = await createAdmin();

    const res = await request(app)[method](path).set("Cookie", sessionCookie(admin));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("GET /Admin", () => {
  it("lists sentences awaiting review, newest first, with authors", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await createSentence(user, { show: "older", createdAt: new Date("2024-01-01") });
    await createSentence(user, { show: "newer", createdAt: new Date("2024-02-01") });
    await createSentence(user, { show: "approved", approved: true });
    await createSentence(user, { show: "sent back", toRedo: true });

    const res = await request(app).get("/Admin").set("Cookie", sessionCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.show)).toEqual(["newer", "older"]);
    expect(res.body[0].author.firstName).toBe("Ada");
  });

  // The review page shows only the author's name, so that's all it gets: not
  // their email, Google account id (`id`), admin flag or login token version.
  it("shows only each author's name, never the rest of their profile", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await createSentence(user);

    const res = await request(app).get("/Admin").set("Cookie", sessionCookie(admin));

    expect(res.status).toBe(200);
    // Exactly these fields: any other field on an author fails the test
    expect(res.body.map((s) => s.author)).toStrictEqual([
      { firstName: "Ada", lastName: "Lovelace" },
    ]);
  });

  it("keeps newest first even for sentences written within the same second", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    await createSentence(user, { show: "older", createdAt: new Date("2026-10-06T04:02:45.643Z") });
    await createSentence(user, { show: "newer", createdAt: new Date("2026-10-06T04:02:45.993Z") });

    const res = await request(app).get("/Admin").set("Cookie", sessionCookie(admin));

    expect(res.body.map((s) => s.show)).toEqual(["newer", "older"]);
  });
});

describe("PATCH /Admin", () => {
  it("returns the remaining queue newest first, even within the same second", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const target = await createSentence(user, { show: "approve me" });
    await createSentence(user, { show: "older", createdAt: new Date("2026-10-06T04:02:45.643Z") });
    await createSentence(user, { show: "newer", createdAt: new Date("2026-10-06T04:02:45.993Z") });

    const res = await request(app)
      .patch("/Admin")
      .set("Cookie", sessionCookie(admin))
      .send({ status: "approve", sentence: { _id: target._id } });

    expect(res.body.map((s) => s.show)).toEqual(["newer", "older"]);
  });

  it("approves a sentence and returns the remaining queue", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const target = await createSentence(user, { show: "approve me" });
    await createSentence(user, { show: "still waiting" });

    const res = await request(app)
      .patch("/Admin")
      .set("Cookie", sessionCookie(admin))
      .send({ status: "approve", sentence: { _id: target._id } });

    expect(res.status).toBe(201);
    expect(res.body.map((s) => s.show)).toEqual(["still waiting"]);
    // The queue sent back shows only the author's name too (see GET /Admin)
    expect(res.body[0].author).toStrictEqual({ firstName: "Ada", lastName: "Lovelace" });
    const saved = await Sentence.findById(target._id);
    expect(saved.approved).toBe(true);
    expect(saved.toRedo).toBe(false);
  });

  it("sends a sentence back for a redo", async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const target = await createSentence(user, { approved: true });

    await request(app)
      .patch("/Admin")
      .set("Cookie", sessionCookie(admin))
      .send({ status: "redo", sentence: { _id: target._id } });

    const saved = await Sentence.findById(target._id);
    expect(saved.toRedo).toBe(true);
    expect(saved.approved).toBe(false);
  });

  // An id that's a database instruction, like {"$ne": null} ("any
  // sentence"), must not approve a sentence nobody picked.
  it.each([[{ $ne: null }], [{ $gt: "" }], ["not-an-id"], [12345]])(
    "refuses a sentence id that isn't one (%j) and approves nothing",
    async (id) => {
      const admin = await createAdmin();
      const author = await createUser();
      await createSentence(author, { title: "Day 1" });

      const res = await request(app)
        .patch("/Admin")
        .set("Cookie", sessionCookie(admin))
        .send({ status: "approve", sentence: { _id: id } });

      expect(res.status).toBe(400);
      expect(await Sentence.countDocuments({ approved: true })).toBe(0);
    }
  );

  it("returns 404 for a sentence that doesn't exist", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .patch("/Admin")
      .set("Cookie", sessionCookie(admin))
      .send({ status: "approve", sentence: { _id: "65f000000000000000000000" } });

    expect(res.status).toBe(404);
  });
});
