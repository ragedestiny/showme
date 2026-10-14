// The data the backend sends, as the website uses it (see backend/models/ and
// backend/controllers/routes.ts). Only the fields the website reads are
// listed. TypeScript checks the website's code against these, but it can't
// check that the server really sends them: if the backend changes what it
// sends, change this file too.

// A day's tell sentence, from GET / (backend/public/tellList.ts)
export interface TellSentence {
  key: number;
  title: string; // "Day 1"
  tell: string;
  image: string; // its picture on the Collections page
}

// The signed-in user, from GET /Login (backend/models/profile.ts)
export interface User {
  id: string; // the Google account's id
  firstName: string;
  // Not required by the database: accounts made before last names were
  // saved, or whose Google account has none, may not have one
  lastName?: string;
  email: string;
  isAdmin: boolean;
}

// A student's sentence (backend/models/sentences.ts), as GET /MyPage sends them
export interface Sentence {
  _id: string;
  title: string; // the day it was written for: "day1", "day2", ...
  tell: string;
  show: string;
  approved: boolean;
  toRedo: boolean; // an admin sent it back to be rewritten
  createdAt: string; // when it was written or last edited
}

// Who wrote a sentence, as the admin queue and Collections show it
export type Author = Pick<User, "firstName" | "lastName">;

// A sentence with its author filled in: GET /Admin (the review queue) and
// GET /Collections (approved sentences) send these
export interface SentenceWithAuthor extends Sentence {
  author: Author;
}

// What MyPage sends to save a new sentence (POST /MyPage). The server takes
// the author from the login cookie, never from here.
export interface NewSentence {
  title: string;
  tell: string;
  show: string;
  hideedit: boolean;
}

// What MyPage sends to save an edit (PATCH /MyPage): the whole sentence with
// the new text. The server only reads `title` (which sentence) and `show`
// (the new text), and sets the rest itself.
export interface EditedSentence extends Omit<Sentence, "createdAt"> {
  createdAt: Date;
}

// What an admin decides about a sentence in the review queue (PATCH /Admin)
export type ReviewDecision = "approve" | "redo";
