import { logger } from "firebase-functions/logger";

// Connect to MongoDB, and keep trying until it works.
//
// A server instance connects once, when it starts. If that single attempt
// failed (a network hiccup, or the database briefly unreachable), mongoose
// does not try again by itself: every request on that instance would wait
// 10 seconds and fail until Google replaced the instance. Retrying here means
// a failed start heals itself within seconds.
//
// Each failed attempt is a WARNING, not an ERROR: the next try usually works.
// If it never does, every request fails and those are logged as errors.
export const connectWithRetry = async (
  connect,
  { retryDelayMs = 5000, log = logger.warn } = {}
) => {
  for (let attempt = 1; ; attempt++) {
    try {
      await connect();
      return attempt;
    } catch (error) {
      log(
        `MongoDB connection attempt ${attempt} failed: ${error.message}. ` +
          `Retrying in ${retryDelayMs / 1000}s.`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
