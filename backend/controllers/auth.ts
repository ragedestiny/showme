import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client, type LoginTicket } from "google-auth-library";
import { LoginAnswer, LoginBody } from "../contract/api.js";
import Profile from "../models/profile.js";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  jwtSecret,
  sessionCookieOptions,
} from "../config/session.js";
import { answer } from "../utils/answer.js";
import { messageOf } from "../utils/errors.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Log `user` in: sign our login token, put it in the session cookie and send
// the profile back. Shared by the Google login and the staging test login, so
// both produce exactly the same kind of session.
export const startSession = (
  res: Response,
  user: { id: string; tokenVersion: number }
) => {
  // v = the user's current token version; logging out changes it.
  const customToken = jwt.sign(
    { id: user.id, v: user.tokenVersion },
    jwtSecret(),
    { expiresIn: SESSION_SECONDS }
  );

  // The browser stores this cookie and sends it back on every request.
  // Express wants maxAge in milliseconds.
  res.cookie(SESSION_COOKIE, customToken, {
    ...sessionCookieOptions,
    maxAge: SESSION_SECONDS * 1000,
  });

  // The token travels only in the httpOnly cookie, never in the body, where
  // scripts in the page could read it. The profile is sent as the contract
  // lists it, without its login details.
  answer(res, 200, LoginAnswer, { user });
};

export const googleAuth = async (req: Request, res: Response) => {
  // Express 5 leaves req.body undefined when a request has no body.
  const body = LoginBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(401).json({ message: "Invalid Google token" });
  }
  const { token } = body.data;

  // Check the Google token on its own, so a bad token gets 401 ("show valid
  // ID") instead of 500 ("our server broke").
  let ticket: LoginTicket;
  try {
    ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    // Not saved for the log line (unlike other errors): Google's message can
    // hold the whole token, and a bad token is the visitor's problem, not a
    // fault on our side. The 401 itself still shows up in the log.
    return res.status(401).json({ message: "Invalid Google token" });
  }

  // A token Google verified always names the account (sub) and its email.
  // Without them there's no one to log in.
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    return res.status(401).json({ message: "Invalid Google token" });
  }
  const { sub, given_name, family_name, email } = payload;

  try {

    let user = await Profile.findOne({ id: sub });

    if (!user) {
      // Google doesn't always send a first name, and a profile needs one.
      // "Student" stands in, never part of the email: the name shows on
      // Collections, which anyone can see.
      const fName = given_name
        ? given_name.charAt(0).toUpperCase() + given_name.slice(1)
        : "Student";
      const lName = family_name
        ? family_name.charAt(0).toUpperCase() + family_name.slice(1)
        : "";

      user = new Profile({
        id: sub,
        firstName: fName,
        lastName: lName,
        email,
      });

      await user.save();
    }

    startSession(res, user);
  } catch (error) {
    // Saved for this request's log line (see middlewares/requestLog.ts)
    res.locals.error = error;
    res.status(500).json({
      message: "Google authentication failed",
      error: messageOf(error),
    });
  }
};
