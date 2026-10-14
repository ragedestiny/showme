import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The deploy writes the git commit into APP_VERSION. The "Promote to
// production" workflow reads it from staging to know which commit to promote,
// then from production to confirm the promotion landed.
describe("GET /version", () => {
  it("answers with the commit this server was deployed from", async () => {
    vi.stubEnv("APP_VERSION", "0123abcd");

    const res = await request(app).get("/version");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ version: "0123abcd" });
  });

  it('answers "local" when running outside a deploy (tests, emulator)', async () => {
    vi.stubEnv("APP_VERSION", "");

    const res = await request(app).get("/version");

    expect(res.body).toEqual({ version: "local" });
  });
});
