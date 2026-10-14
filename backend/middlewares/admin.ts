import type { NextFunction, Request, Response } from "express";
import Profile from "../models/profile.js";
import { messageOf } from "../utils/errors.js";

const admin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await Profile.findOne({ id: req.userId });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    next();
  } catch (error) {
    // Saved for this request's log line (see middlewares/requestLog.ts)
    res.locals.error = error;
    res.status(500).json({ message: messageOf(error) });
  }
};

export default admin;
