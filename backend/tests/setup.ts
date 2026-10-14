import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { logger } from "firebase-functions/logger";

let mongod;

// Keep log lines out of the test output. Tests that check what gets logged
// read them from logger.write's calls instead.
vi.spyOn(logger, "write").mockImplementation(() => {});

// Start a throwaway MongoDB and point mongoose at it, just as index.ts
// connects to Atlas in production.
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// Wipe every collection between tests so each test starts from an empty
// database and no test depends on what another test left behind.
afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
