import jwt from "jsonwebtoken";
import { SESSION_COOKIE } from "../config/session.js";
import Profile from "../models/profile.js";

// The contents ({ id, v }) of the login token in the session cookie, if it's
// present, correctly signed and not expired; otherwise null.
export const readSession = (req) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const auth = async (req, res, next) => {
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
    res.status(500).json({ message: error.message });
  }
};

export default auth;
