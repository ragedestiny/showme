import { expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { logger } from "firebase-functions/logger";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";

// The log line written for the one request to `path` (see
// middlewares/requestLog.ts). tests/setup.ts replaces logger.write with a
// fake, so this reads what would have been written. The line is written when
// the response finishes, which can be a moment after supertest has the answer.
export const logLineFor = (path) =>
  vi.waitFor(() => {
    const lines = logger.write.mock.calls
      .map(([entry]) => entry)
      .filter((entry) => entry.path === path);
    expect(lines).toHaveLength(1);
    return lines[0];
  });

// Create a user in the test database. `id` is the Google account id ("sub").
export const createUser = (overrides = {}) =>
  Profile.create({
    id: "google-user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    ...overrides,
  });

export const createAdmin = (overrides = {}) =>
  createUser({
    id: "google-admin-1",
    firstName: "Grace",
    email: "grace@example.com",
    isAdmin: true,
    ...overrides,
  });

// Sign a JWT exactly the way controllers/auth.ts does after a Google login.
export const tokenFor = (user, options = { expiresIn: "1h" }) =>
  jwt.sign({ id: user.id, v: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, options);

// The Cookie header a browser sends back after logging in.
export const sessionCookie = (user) => `session=${tokenFor(user)}`;

// The token inside the session cookie that a POST /auth response sets.
export const tokenFromLogin = (res) =>
  res.headers["set-cookie"]
    .find((c) => c.startsWith("session="))
    .split(";")[0]
    .slice("session=".length);

export const createSentence = (user, overrides = {}) =>
  Sentence.create({
    title: "The room was messy.",
    tell: "The room was messy.",
    show: "Clothes carpeted the floor.",
    author: user._id,
    GID: user.id,
    ...overrides,
  });
