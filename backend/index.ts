// Settings come from .env (and .env.local in the emulator). Firebase loads
// them into process.env before this file runs, both when deployed and in the
// emulator, so no library is needed here.
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import mongoose from "mongoose";
import app from "./app.js";
import { connectWithRetry } from "./config/db.js";

mongoose.set("strictQuery", false);
// Connect to mongodb via mongoose. DATABASE_NAME overrides the database in the
// connection string; set it in .env.local so only the emulator uses the dev DB.
// Requests that arrive before the connection is ready wait for it (mongoose
// holds them for up to 10 seconds), so the function can start serving at once.
if (process.env.DATABASE_ACCESS) {
  connectWithRetry(() =>
    mongoose.connect(process.env.DATABASE_ACCESS, {
      dbName: process.env.DATABASE_NAME,
      // Give up on one attempt after 10s (default 30s), so a retry comes sooner
      serverSelectionTimeoutMS: 10000,
    })
  );
} else {
  logger.error("DATABASE_ACCESS is not set; the database is unavailable.");
}

// 2nd generation: one instance serves many requests at once.
export const apiv2 = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    // Up to 80 requests share one instance before another one starts.
    concurrency: 80,
    // A spending cap: never run more than 10 instances, whatever the traffic.
    maxInstances: 10,
  },
  app
);
