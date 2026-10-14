import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Runs once before everything: makes sure the MongoDB program is downloaded.
    globalSetup: ["./tests/globalSetup.ts"],
    // Runs before every test file: starts an in-memory MongoDB.
    setupFiles: ["./tests/setup.ts"],
    // Each test file runs in its own process with its own database and its own
    // copy of mongoose, so files can't see each other's data.
    pool: "forks",
    // Starting mongod (and downloading it on the very first run) can be slow.
    hookTimeout: 120000,
    // Fake values so tests never depend on (or leak) the real secrets in .env.
    env: {
      JWT_SECRET: "test-jwt-secret",
      GOOGLE_CLIENT_ID: "test-google-client-id",
    },
  },
});
