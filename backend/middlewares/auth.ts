import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { SESSION_COOKIE, jwtSecret } from "../config/session.js";
import Profile from "../models/profile.js";
import { messageOf } from "../utils/errors.js";

// What our login token holds: the user's Google account id, and their token
// version (v) when it was signed (see controllers/auth.ts)
export interface Session {
  id: string;
  v?: number;
}

// The contents ({ id, v }) of the login token in the session cookie, if it's
// present, correctly signed and not expired; otherwise null.
export const readSession = (req: Request): Session | null => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret());
    // We sign every token with an id inside; anything else isn't ours
    if (typeof payload !== "object" || typeof payload.id !== "string") {
      return null;
    }
    return { id: payload.id, v: payload.v };
  } catch (error) {
    return null;
  }
};

const auth = async (req: Request, res: Response, next: NextFunction) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Tokens issued before versions existed have no v; treat them as 0.
    const user = await Profile.findOne({ id: session.id }, "tokenVersion");
    if (!user || user.tokenVersion !== (session.v ?? 0)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.userId = session.id; // the Google id from our custom JWT
    next();
  } catch (error) {
    // Saved for this request's log line (see middlewares/requestLog.ts)
    res.locals.error = error;
    res.status(500).json({ message: messageOf(error) });
  }
};

export default auth;
