import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Profile from "../models/profile.js";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionCookieOptions,
} from "../config/session.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Log `user` in: sign our login token, put it in the session cookie and send
// the profile back. Shared by the Google login and the staging test login, so
// both produce exactly the same kind of session.
export const startSession = (res, user) => {
  // v = the user's current token version; logging out changes it.
  const customToken = jwt.sign(
    { id: user.id, v: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_SECONDS }
  );

  // The browser stores this cookie and sends it back on every request.
  // Express wants maxAge in milliseconds.
  res.cookie(SESSION_COOKIE, customToken, {
    ...sessionCookieOptions,
    maxAge: SESSION_SECONDS * 1000,
  });

  // The token travels only in the httpOnly cookie, never in the body, where
  // scripts in the page could read it.
  res.status(200).json({ user });
};

export const googleAuth = async (req, res) => {
  // Express 5 leaves req.body undefined when a request has no body.
  const { token } = req.body ?? {};
  if (!token) {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  // Check the Google token on its own, so a bad token gets 401 ("show valid
  // ID") instead of 500 ("our server broke").
  let ticket;
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

  try {
    const { sub, given_name, family_name, email } = ticket.getPayload();

    let user = await Profile.findOne({ id: sub }).populate("ownSentences");

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
    res
      .status(500)
      .json({ message: "Google authentication failed", error: error.message });
  }
};
