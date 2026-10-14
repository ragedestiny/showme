import { expect, vi } from "vitest";
import type { Response } from "supertest";
import jwt from "jsonwebtoken";
import { logger } from "firebase-functions/logger";
import type { Types } from "mongoose";
import { jwtSecret } from "../config/session.js";
import Profile, { type ProfileFields } from "../models/profile.js";
import { Sentence, type SentenceFields } from "../models/sentences.js";

// The log line written for the one request to `path` (see
// middlewares/requestLog.ts). tests/setup.ts replaces logger.write with a
// fake, so this reads what would have been written. The line is written when
// the response finishes, which can be a moment after supertest has the answer.
export const logLineFor = (path: string) =>
  vi.waitFor(() => {
    const lines = vi
      .mocked(logger.write)
      .mock.calls.map(([entry]) => entry)
      .filter((entry) => entry.path === path);
    expect(lines).toHaveLength(1);
    return lines[0];
  });

// Create a user in the test database. `id` is the Google account id ("sub").
export const createUser = (overrides: Partial<ProfileFields> = {}) =>
  Profile.create({
    id: "google-user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    ...overrides,
  });

export const createAdmin = (overrides: Partial<ProfileFields> = {}) =>
  createUser({
    id: "google-admin-1",
    firstName: "Grace",
    email: "grace@example.com",
    isAdmin: true,
    ...overrides,
  });

// Who a login token is for: a profile, or just the fields the token holds
interface TokenUser {
  id: string;
  tokenVersion?: number;
}

// Sign a JWT exactly the way controllers/auth.ts does after a Google login.
export const tokenFor = (
  user: TokenUser,
  options: jwt.SignOptions = { expiresIn: "1h" }
) => jwt.sign({ id: user.id, v: user.tokenVersion ?? 0 }, jwtSecret(), options);

// The Cookie header a browser sends back after logging in.
export const sessionCookie = (user: TokenUser) => `session=${tokenFor(user)}`;

// The show sentence, and the author, of each sentence a response lists, in
// order (the body is plain JSON, which TypeScript knows nothing about)
export const showsIn = (res: Response): string[] =>
  res.body.map((sentence: { show: string }) => sentence.show);
export const authorsIn = (res: Response): unknown[] =>
  res.body.map((sentence: { author: unknown }) => sentence.author);

// The token inside the session cookie that a POST /auth response sets.
export const tokenFromLogin = (res: Response) => {
  const cookie = res.get("Set-Cookie")?.find((c) => c.startsWith("session="));
  if (!cookie) throw new Error("The response didn't set a session cookie");
  return cookie.split(";")[0].slice("session=".length);
};

export const createSentence = (
  user: { _id: Types.ObjectId; id: string },
  overrides: Partial<SentenceFields> = {}
) =>
  Sentence.create({
    title: "The room was messy.",
    tell: "The room was messy.",
    show: "Clothes carpeted the floor.",
    author: user._id,
    GID: user.id,
    ...overrides,
  });
