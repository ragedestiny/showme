import { describe, expect, it, vi } from "vitest";
import { connectWithRetry } from "../config/db.js";

describe("connectWithRetry (connecting to MongoDB when a server starts)", () => {
  it("keeps trying after failures until the connection succeeds", async () => {
    // Fails twice (like a network hiccup), then works
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("Could not connect to any servers"))
      .mockRejectedValueOnce(new Error("Could not connect to any servers"))
      .mockResolvedValueOnce();
    const log = vi.fn();

    const attempts = await connectWithRetry(connect, { retryDelayMs: 1, log });

    expect(attempts).toBe(3);
    expect(connect).toHaveBeenCalledTimes(3);
    // Each failure is written to the log, so it shows up in Cloud Run's logs
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toMatch(/attempt 1 failed.*Could not connect/);
  });

  it("connects once and logs nothing when the first try works", async () => {
    const connect = vi.fn().mockResolvedValue();
    const log = vi.fn();

    const attempts = await connectWithRetry(connect, { retryDelayMs: 1, log });

    expect(attempts).toBe(1);
    expect(log).not.toHaveBeenCalled();
  });

  it("waits between attempts instead of hammering the database", async () => {
    vi.useFakeTimers();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce();

    const done = connectWithRetry(connect, { retryDelayMs: 5000, log: () => {} });
    await vi.advanceTimersByTimeAsync(4999);
    expect(connect).toHaveBeenCalledTimes(1); // still waiting
    await vi.advanceTimersByTimeAsync(1);
    expect(await done).toBe(2);
    vi.useRealTimers();
  });
});
