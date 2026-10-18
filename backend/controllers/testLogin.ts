import crypto from "node:crypto";
import type { Request, Response } from "express";
import { TestLoginBody } from "../contract/api.js";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import { messageOf } from "../utils/errors.js";
import { startSession } from "./auth.js";

// A login door for automated browser tests (QA Wolf) on the STAGING backend.
// A robot can't click through "Sign in with Google", so instead it sends a
// shared secret and gets logged in as one of a few fixed test accounts.
// With `fresh: true` it first deletes that test account's own sentences, so
// a test starts from a clean slate (Day 1) every run; the app itself has no
// way to delete a sentence.
//
// Each browser test that wipes sentences gets its own student account, so
// tests running at the same time can't wipe each other's sentences.
//
// The door is shut (the route answers 404, as if it didn't exist) unless ALL
// of these hold:
//   - TEST_LOGIN_SECRET is set (only the staging deploy writes it), and is at
//     least 32 characters long, so it can't be guessed
//   - the code is not running in the production Firebase project, so even a
//     secret copied there by mistake can't open it
const PRODUCTION_PROJECT = "showme-backend-789";
const MIN_SECRET_LENGTH = 32;

// Every test student has the same name, so pages show "Test S." whichever
// one a test uses; only the id and email (built from the role) differ
interface TestAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}

const testStudent = (role: string): TestAccount => ({
  id: `test-${role}`,
  firstName: "Test",
  lastName: "Student",
  email: `test-${role}@showme.test`,
  isAdmin: false,
});

const TEST_ACCOUNTS: Record<string, TestAccount> = {
  student: testStudent("student"),
  "student-approve": testStudent("student-approve"),
  "student-redo": testStudent("student-redo"),
  "student-withdraw": testStudent("student-withdraw"),
  "student-pagination": testStudent("student-pagination"),
  "student-sort": testStudent("student-sort"),
  "student-double-submit": testStudent("student-double-submit"),
  "student-mobile": testStudent("student-mobile"),
  admin: {
    id: "test-admin",
    firstName: "Test",
    lastName: "Admin",
    email: "test-admin@showme.test",
    isAdmin: true,
  },
};

// Firebase tells the code which project it's running in
const currentProject = () => {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}").projectId;
  } catch {
    return undefined;
  }
};

const doorIsOpen = () =>
  (process.env.TEST_LOGIN_SECRET ?? "").length >= MIN_SECRET_LENGTH &&
  currentProject() !== PRODUCTION_PROJECT;

// Compare secrets in constant time, so an attacker can't learn the secret one
// character at a time by measuring how fast wrong guesses are rejected.
// (Hashing first makes both sides the same length, which the compare needs.)
const sameSecret = (given: unknown, expected: string) => {
  const hash = (text: unknown) =>
    crypto.createHash("sha256").update(String(text)).digest();
  return crypto.timingSafeEqual(hash(given), hash(expected));
};

export const testLogin = async (req: Request, res: Response) => {
  if (!doorIsOpen()) {
    return res.status(404).json({ message: "Not found" });
  }

  // The secret first: if it's missing, isn't text or is wrong, that's all the
  // sender learns (401), whatever else the request holds.
  // (doorIsOpen() has checked TEST_LOGIN_SECRET is set)
  const secret = TestLoginBody.shape.secret.safeParse(req.body?.secret);
  if (
    !secret.success ||
    !sameSecret(secret.data, process.env.TEST_LOGIN_SECRET ?? "")
  ) {
    return res.status(401).json({ message: "Invalid test login secret" });
  }

  // Then the rest, which must name one of the test accounts. Object.hasOwn,
  // so built-in names like "toString" don't count as roles.
  const body = TestLoginBody.safeParse(req.body);
  if (!body.success || !Object.hasOwn(TEST_ACCOUNTS, body.data.role)) {
    return res
      .status(400)
      .json({ message: `role must be one of: ${Object.keys(TEST_ACCOUNTS).join(", ")}` });
  }
  const { role, fresh } = body.data;
  const account = TEST_ACCOUNTS[role];

  try {
    // Only ever the test account's own sentences (matched by its fixed id),
    // both the sentences themselves and the profile's list of them
    if (fresh === true) {
      await Sentence.deleteMany({ GID: account.id });
      await Profile.updateOne({ id: account.id }, { $set: { ownSentences: [] } });
    }

    // Create the test account the first time; reuse it after that
    const user = await Profile.findOneAndUpdate(
      { id: account.id },
      { $setOnInsert: account },
      { upsert: true, returnDocument: "after" }
    );

    startSession(res, user);
  } catch (error) {
    // Saved for this request's log line (see middlewares/requestLog.ts)
    res.locals.error = error;
    res
      .status(500)
      .json({ message: "Test login failed", error: messageOf(error) });
  }
};
