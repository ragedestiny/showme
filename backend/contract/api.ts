// The API's contract: what each request to the backend may hold, and what
// each answer holds. One definition, used on both sides:
// - The server checks every request body against it (controllers/). Only
//   the fields listed here reach the code; zod drops anything else.
// - The website imports its types (client/src/api/types.ts), so TypeScript
//   checks that the website sends and reads these same shapes.
//
// The website only ever imports *types* from here (`import type`), and types
// disappear when it's built: neither this code nor zod is sent to browsers.
// So this file imports nothing but zod.
import { z } from "zod";

// ---- Requests --------------------------------------------------------------

// What a refused request is told. The website and the tests rely on these.
const BLANK_SHOW = "The show sentence can't be empty";
const TITLE_NOT_TEXT = "The title must be text";
const INVALID_ID = "Invalid sentence id";

// A show sentence must be text with something besides spaces and line breaks,
// so a blank one can't use up a day or wipe out a written one. (The website
// checks this too, but anyone can send requests straight to the server.) It's
// saved as written: checked, not trimmed.
const showSentence = z
  .string({ error: BLANK_SHOW })
  .refine((show) => show.trim() !== "", { error: BLANK_SHOW });

// POST /MyPage: a student's sentence for a new day. Who wrote it, when, and
// whether it's approved are set by the server, never taken from the request.
// (`show` comes first, so a blank sentence is the problem reported first.)
export const NewSentenceBody = z.object({
  show: showSentence,
  title: z.string({ error: TITLE_NOT_TEXT }), // the day: "day1", "day2", ...
  tell: z.string({ error: "The tell sentence must be text" }),
});

// PATCH /MyPage: new text for one of the student's own sentences, picked by
// its title. The title goes into a database query, so it must be plain text:
// an object like {"$gt": ""} would be read by MongoDB as "any title".
export const EditSentenceBody = z.object({
  title: z.string({ error: TITLE_NOT_TEXT }),
  show: showSentence,
});

// PATCH /Admin: an admin's decision on a sentence in the review queue. The id
// goes into a database query, so it must be a real id written as text (24
// hexadecimal digits): an object like {"$ne": null} would be read as "any
// sentence".
export const ReviewBody = z.object({
  sentence: z.object(
    {
      _id: z
        .string({ error: INVALID_ID })
        .regex(/^[0-9a-f]{24}$/i, { error: INVALID_ID }),
    },
    { error: INVALID_ID }
  ),
  status: z.enum(["approve", "redo"], {
    error: "The status must be approve or redo",
  }),
});

// POST /auth: the ID token Google's sign-in button gave the website
export const LoginBody = z.object({
  token: z.string().min(1),
});

// POST /auth/test, the staging-only login for automated browser tests (see
// controllers/testLogin.ts). Anything but `fresh: true` means "keep the test
// account's sentences", as it always has.
export const TestLoginBody = z.object({
  secret: z.string().min(1),
  role: z.string(),
  fresh: z.boolean().optional().catch(undefined),
});

// ---- Answers ---------------------------------------------------------------
// What each answer holds, and all it holds: the server sends every answer
// through these (utils/answer.ts), so a field a document has but the
// contract doesn't list (a profile's login details, a sentence's GID) never
// leaves the server.

// GET /: a day's tell sentence (backend/public/tellList.ts)
export const TellSentence = z.object({
  key: z.number(),
  title: z.string(), // "Day 1"
  tell: z.string(),
  image: z.string(), // its picture on the Collections page
});

// The signed-in user: GET /Login, and POST /auth as { user }
export const User = z.object({
  id: z.string(), // the Google account's id
  firstName: z.string(),
  // Not required by the database: accounts made before last names were
  // saved, or whose Google account has none, may not have one. An old
  // account might hold null instead; that's sent as no last name.
  lastName: z
    .string()
    .nullable()
    .transform((name) => name ?? undefined)
    .optional(),
  email: z.string(),
  isAdmin: z.boolean(),
});
export const LoginAnswer = z.object({ user: User });

// A student's sentence: GET /MyPage lists them, and POST and PATCH /MyPage
// send back the one saved
export const Sentence = z.object({
  _id: z.string(),
  title: z.string(), // the day it was written for: "day1", "day2", ...
  tell: z.string(),
  show: z.string(),
  approved: z.boolean(),
  toRedo: z.boolean(), // an admin sent it back to be rewritten
  createdAt: z.string(), // when it was written or last edited (an ISO date)
});

// Who wrote a sentence, as Collections (which anyone can see) and the review
// queue show it: only the name
export const Author = User.pick({ firstName: true, lastName: true });

// GET /Collections (approved sentences) and GET/PATCH /Admin (the queue)
export const SentenceWithAuthor = Sentence.extend({ author: Author });

// The lists: GET / (tell sentences), GET /MyPage (a student's own
// sentences), GET /Collections and GET/PATCH /Admin
export const TellSentences = z.array(TellSentence);
export const Sentences = z.array(Sentence);
export const SentencesWithAuthors = z.array(SentenceWithAuthor);

// Any refused or failed request: why
export const ErrorAnswer = z.object({ message: z.string() });

// ---- TypeScript types, read from the definitions above ---------------------

export type NewSentenceBody = z.infer<typeof NewSentenceBody>;
export type EditSentenceBody = z.infer<typeof EditSentenceBody>;
export type ReviewBody = z.infer<typeof ReviewBody>;
export type LoginBody = z.infer<typeof LoginBody>;
export type TestLoginBody = z.infer<typeof TestLoginBody>;
export type TellSentence = z.infer<typeof TellSentence>;
export type User = z.infer<typeof User>;
export type LoginAnswer = z.infer<typeof LoginAnswer>;
export type Sentence = z.infer<typeof Sentence>;
export type Author = z.infer<typeof Author>;
export type SentenceWithAuthor = z.infer<typeof SentenceWithAuthor>;
export type ErrorAnswer = z.infer<typeof ErrorAnswer>;
