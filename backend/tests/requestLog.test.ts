import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import request from "supertest";
import { logger } from "firebase-functions/logger";
import app from "../app.js";
import { Sentence } from "../models/sentences.js";
import { createUser, logLineFor, sessionCookie } from "./helpers.js";

beforeEach(() => {
  logger.write.mockClear();
});

describe("request log (one structured line per request)", () => {
  it("records the method, path, status and how long it took", async () => {
    await request(app).get("/version");

    expect(await logLineFor("/version")).toEqual({
      severity: "INFO",
      message: expect.stringMatching(/^GET \/version 200 in \d+ ms$/),
      method: "GET",
      path: "/version",
      status: 200,
      durationMs: expect.any(Number),
      userId: undefined,
      version: expect.any(String),
    });
  });

  it("records which deploy wrote the line", async () => {
    onTestFinished(() => vi.unstubAllEnvs());

    // The deploy workflows write the git commit into APP_VERSION
    vi.stubEnv("APP_VERSION", "0123abcd");
    await request(app).get("/version");
    expect(await logLineFor("/version")).toMatchObject({ version: "0123abcd" });

    // Tests and the emulator have none
    logger.write.mockClear();
    vi.stubEnv("APP_VERSION", "");
    await request(app).get("/version");
    expect(await logLineFor("/version")).toMatchObject({ version: "local" });
  });

  it("records who made the request when they're logged in", async () => {
    const ada = await createUser();

    await request(app).get("/MyPage").set("Cookie", sessionCookie(ada));

    expect(await logLineFor("/MyPage")).toMatchObject({
      status: 200,
      userId: "google-user-1",
    });
  });

  it("treats a logged-out visit as normal, not an error", async () => {
    // The site asks /Login on every visit; a logged-out visitor gets 401
    await request(app).get("/Login");

    expect(await logLineFor("/Login")).toMatchObject({ severity: "INFO", status: 401 });
  });

  it("marks a request that hit an error as ERROR, with the reason and where it happened", async () => {
    const ada = await createUser();
    const find = vi
      .spyOn(Sentence, "find")
      .mockRejectedValueOnce(new Error("database is down"));
    onTestFinished(() => find.mockRestore());

    const res = await request(app).get("/MyPage").set("Cookie", sessionCookie(ada));

    // The answer to the browser is unchanged; only the log line is new
    expect(res.status).toBe(404);
    const line = await logLineFor("/MyPage");
    expect(line).toMatchObject({
      severity: "ERROR",
      status: 404,
      userId: "google-user-1",
      error: "database is down",
    });
    expect(line.stack_trace).toMatch(/^Error: database is down\n\s+at /);
  });

  it("never logs the session cookie, what the student wrote or the query string", async () => {
    const ada = await createUser();
    const cookie = sessionCookie(ada);

    await request(app)
      .post("/MyPage?note=private-query-text")
      .set("Cookie", cookie)
      .send({ title: "Day 1", tell: "It is cold.", show: "Frost bit my fingers." });

    const written = JSON.stringify(await logLineFor("/MyPage"));
    expect(written).not.toContain(cookie.slice("session=".length));
    expect(written).not.toContain("Frost bit");
    expect(written).not.toContain("private-query-text");
  });
});
