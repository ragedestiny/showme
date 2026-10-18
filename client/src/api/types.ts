// The data the website sends to the backend and reads back. It all comes
// from the backend's API contract (backend/contract/api.ts), the same
// definitions the server checks every request against, so the two sides
// can't drift apart unnoticed: a change there that the website doesn't
// match fails `npm run typecheck` here.
//
// Only types are imported, and types disappear when the site is built: no
// backend code (nor zod, which the contract uses) ends up in the website.
// The type check reads zod's types from backend/node_modules, so the backend's
// packages must be installed too (`npm install` in backend/).
import type { ReviewBody } from "../../../backend/contract/api";

export type {
  // what the website sends
  EditSentenceBody,
  LoginBody,
  NewSentenceBody,
  ReviewBody,
  // what it reads back
  Author,
  Sentence,
  SentenceWithAuthor,
  TellSentence,
  User,
} from "../../../backend/contract/api";

// What an admin decides about a sentence in the review queue (PATCH /Admin)
export type ReviewDecision = ReviewBody["status"];
