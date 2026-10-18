import type { Request, Response } from "express";
import {
  EditSentenceBody,
  NewSentenceBody,
  ReviewBody,
} from "../contract/api.js";
import { Sentence } from "../models/sentences.js";
import Profile from "../models/profile.js";
import tellList from "../public/tellList.js";
import { readSession } from "../middlewares/auth.js";
import { SESSION_COOKIE, sessionCookieOptions } from "../config/session.js";
import { firstProblem, messageOf } from "../utils/errors.js";

// Route for getting the Tell Sentences. The list lives in the code
// (public/tellList.ts), so it's sent straight from memory with no database
// round trips.
export const getTellSentences = (req: Request, res: Response) => {
  res.status(200).json(tellList);
};

export const getUserSentences = async (req: Request, res: Response) => {
  try {
    const userSentences = await Sentence.find({ GID: req.userId });

    res.status(200).json(userSentences);
  } catch (error) {
    // Saved for this request's log line (see middlewares/requestLog.ts)
    res.locals.error = error;
    res.status(404).json({ message: messageOf(error) });
  }
};

// Newest first, to the millisecond. Not sorted by the database: some early
// sentences hold their date as text, and the database puts every text date
// after every real one. new Date() reads both kinds, keeping milliseconds
// (unlike Date.parse on a Date, which drops them).
const newestFirst = <T extends { createdAt: Date }>(sentences: T[]) =>
  sentences.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

// Sentences matching `filter`, newest first, with each author's name filled
// in. Used by the review queue (/Admin, admins only) and Collections (anyone,
// no login needed). Both pages show only the author's name, so only the name
// is sent: the rest of a profile holds the student's email, their Google
// account id and their login details. A sentence's own GID is that same
// Google account id, so it's left out too.
const sentencesWithAuthorNames = async (filter: {
  approved: boolean;
  toRedo?: boolean;
}) =>
  newestFirst(
    await Sentence.find(filter, "-GID").populate(
      "author",
      "firstName lastName -_id"
    )
  );

export const createNewUserSentence = async (req: Request, res: Response) => {
  try {
    // Only the sentence text comes from the browser. Who wrote it comes from
    // the verified token (req.userId), never from the request body, which
    // anyone can edit. (Express 5 leaves req.body undefined when a request
    // has no body.)
    const body = NewSentenceBody.safeParse(req.body ?? {});
    if (!body.success) {
      return res.status(400).json({ message: firstProblem(body.error) });
    }
    const { show, title, tell } = body.data;

    const user = await Profile.findOne({ id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // When User creates a new show sentence
    const newSentence = new Sentence({
      title,
      tell,
      show,
      author: user._id,
      GID: user.id,
    });
    await newSentence.save();
    user.ownSentences.push(newSentence._id);
    await user.save();
    res.status(201).json(newSentence);
  } catch (error) {
    res.locals.error = error;
    res.status(409).json({ message: messageOf(error) });
  }
};

export const editUserSentence = async (req: Request, res: Response) => {
  try {
    // The title must be plain text and the sentence not blank (see the
    // contract): an object title would pick out a sentence the request
    // never named.
    const body = EditSentenceBody.safeParse(req.body ?? {});
    if (!body.success) {
      return res.status(400).json({ message: firstProblem(body.error) });
    }
    const { title, show } = body.data;
    // find sentence to replace
    const updateSentence = await Sentence.findOne({
      GID: req.userId,
      title: title,
    });

    if (!updateSentence) {
      return res.status(404).json({ message: "Sentence not found" });
    }

    // update with new sentence
    updateSentence.show = show;
    updateSentence.createdAt = new Date();
    updateSentence.toRedo = false;
    updateSentence.approved = false;
    await updateSentence.save();
    // send back updated sentence

    res.status(201).json(updateSentence);
  } catch (error) {
    res.locals.error = error;
    res.status(409).json({ message: messageOf(error) });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    // If the request carries a valid login, bump the user's token version so
    // that token, and every copy of it, stops working.
    const session = readSession(req);
    if (session) {
      await Profile.updateOne({ id: session.id }, { $inc: { tokenVersion: 1 } });
    }

    // Always tell the browser to delete its cookie, even if the token was
    // missing or already expired. The options must match the ones it was set with.
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    res.locals.error = error;
    res.status(500).json({ message: messageOf(error) });
  }
};

// Route for register/Retrieve/signout user
export const getUserInfo = async (req: Request, res: Response) => {
  // Register/Retrieve user
  try {
    const user = await Profile.findOne({ id: req.userId }).populate(
      "ownSentences"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.locals.error = error;
    res.status(500).json({ message: messageOf(error) });
  }
};

// Route for fetching all sentences awaiting approval
export const getPendingApprovalSentences = async (
  req: Request,
  res: Response
) => {
  try {
    // fetch all sentences that are not approved, newest (last edited) first
    const awaitingApproval = await sentencesWithAuthorNames({
      approved: false,
      toRedo: false,
    });
    res.status(200).json(awaitingApproval);
  } catch (error) {
    res.locals.error = error;
    res.status(409).json({ message: messageOf(error) });
  }
};

// Route for approving or rejecting sentences
export const updatePendingApprovalSentences = async (
  req: Request,
  res: Response
) => {
  try {
    // The admin middleware on this route has already checked isAdmin.
    // The id must be a real id written as text, and the decision approve or
    // redo (see the contract): an object id would pick out a sentence nobody
    // chose.
    const body = ReviewBody.safeParse(req.body ?? {});
    if (!body.success) {
      return res.status(400).json({ message: firstProblem(body.error) });
    }
    const { status, sentence } = body.data;

    const checkedSentence = await Sentence.findById(sentence._id);

    if (!checkedSentence) {
      return res.status(404).json({ message: "Sentence not found" });
    }

    // update status depending if approve or needs redo
    if (status === "approve") {
      checkedSentence.approved = true;
      checkedSentence.toRedo = false; // Ensure redo flag is cleared if approved
    } else {
      // "redo", the only other decision the contract allows
      checkedSentence.toRedo = true;
      checkedSentence.approved = false; // Ensure approved flag is cleared if redo
    }
    await checkedSentence.save();

    // send back the updated queue, newest first
    const awaitingApproval = await sentencesWithAuthorNames({
      approved: false,
      toRedo: false,
    });

    res.status(201).json(awaitingApproval);
  } catch (error) {
    res.locals.error = error;
    res.status(409).json({ message: messageOf(error) });
  }
};

// fetch approved sentences from database
export const fetchApprovedSentences = async (req: Request, res: Response) => {
  try {
    // find all approved sentences, newest first
    const approvedSentences = await sentencesWithAuthorNames({
      approved: true,
    });

    res.status(200).json(approvedSentences);
  } catch (error) {
    res.locals.error = error;
    res.status(409).json({ message: messageOf(error) });
  }
};
