import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import tellList from "../public/tellList.js";
import { Sentence } from "../models/sentences.js";
import { createSentence, createUser } from "./helpers.js";

describe("GET / (tell sentences)", () => {
  it("returns every tell sentence, exactly as listed, without needing a login", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    // Straight from public/tellList.js: no database round trips, no _id fields.
    expect(res.body).toEqual(tellList);
  });
});

describe("GET /Collections (approved sentences)", () => {
  it("returns only approved sentences, newest first, with authors, without needing a login", async () => {
    const user = await createUser();
    await createSentence(user, { show: "old", approved: true, createdAt: new Date("2024-01-01") });
    await createSentence(user, { show: "new", approved: true, createdAt: new Date("2024-03-01") });
    await createSentence(user, { show: "pending" });

    const res = await request(app).get("/Collections");

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.show)).toEqual(["new", "old"]);
    expect(res.body[0].author.firstName).toBe("Ada");
  });

  // Anyone can load this page, so it must show a student's name and nothing
  // else from their profile: not their email, Google account id (`id`),
  // admin flag or login token version.
  it("shows only each author's name, never the rest of their profile", async () => {
    const ada = await createUser();
    const alan = await createUser({
      id: "google-user-2",
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@example.com",
    });
    await createSentence(ada, { approved: true, createdAt: new Date("2024-01-01") });
    await createSentence(alan, { approved: true, createdAt: new Date("2024-02-01") });

    const res = await request(app).get("/Collections");

    expect(res.status).toBe(200);
    // Exactly these fields: any other field on an author fails the test
    expect(res.body.map((s) => s.author)).toStrictEqual([
      { firstName: "Alan", lastName: "Turing" },
      { firstName: "Ada", lastName: "Lovelace" },
    ]);
    // Each sentence also stores its author's Google account id, as GID
    for (const sentence of res.body) {
      expect(sentence).not.toHaveProperty("GID");
    }
  });

  it("keeps newest first even for sentences written within the same second", async () => {
    const user = await createUser();
    // Saved first, 350 ms older: the database would hand it back first
    await createSentence(user, {
      show: "older",
      approved: true,
      createdAt: new Date("2026-10-06T04:02:45.643Z"),
    });
    await createSentence(user, {
      show: "newer",
      approved: true,
      createdAt: new Date("2026-10-06T04:02:45.993Z"),
    });

    const res = await request(app).get("/Collections");

    expect(res.body.map((s) => s.show)).toEqual(["newer", "older"]);
  });

  it("sorts old sentences whose date was stored as text among the others", async () => {
    const user = await createUser();
    await createSentence(user, {
      show: "oldest",
      approved: true,
      createdAt: new Date("2023-03-11T18:58:18.036Z"),
    });
    await createSentence(user, {
      show: "newest",
      approved: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    // Some early sentences hold their date as text, not a Date. Written
    // straight to the collection, past the app, as they were back then.
    await Sentence.collection.insertOne({
      title: "day1",
      tell: "It is cold outside.",
      show: "middle (date stored as text)",
      approved: true,
      toRedo: false,
      author: user._id,
      GID: user.id,
      createdAt: "2023-03-23T00:28:12.589Z",
    });

    const res = await request(app).get("/Collections");

    expect(res.body.map((s) => s.show)).toEqual([
      "newest",
      "middle (date stored as text)",
      "oldest",
    ]);
  });
});
