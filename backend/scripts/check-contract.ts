// Checks that every sentence and profile in a database fits the API
// contract (contract/api.ts), changing nothing. The server sends answers
// through the contract, and a stored document that doesn't fit makes the
// request that sends it fail. So run this before deploying a change to the
// contract's answers, against each database that change will meet.
//
//   npm run check:contract               the practice database (.env.local)
//   npm run check:contract:production    the real one (.env only)
//
// It only reads. It prints counts and the names of fields that don't fit,
// never anything stored in them (no names, emails or sentences). It also
// counts profiles left with the old placeholder id "test" (see below).
import mongoose from "mongoose";
import type { z } from "zod";
import {
  Sentence as SentenceAnswer,
  SentenceWithAuthor,
  User,
} from "../contract/api.js";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import { messageOf } from "../utils/errors.js";

const databaseAccess = process.env.DATABASE_ACCESS;
if (!databaseAccess) {
  console.error("Can't run: DATABASE_ACCESS (from .env) is not set.");
  process.exit(1);
}

// Checks each document as the server would send it (the same JSON round
// trip as utils/answer.ts) and prints what doesn't fit, with how often
const check = async (
  label: string,
  documents: AsyncIterable<unknown>,
  schema: z.ZodType
) => {
  let fit = 0;
  const problems = new Map<string, number>();
  for await (const document of documents) {
    const result = schema.safeParse(JSON.parse(JSON.stringify(document)));
    if (result.success) {
      fit++;
      continue;
    }
    for (const issue of result.error.issues) {
      const where = `${issue.path.join(".") || "(whole document)"}: ${issue.code}`;
      problems.set(where, (problems.get(where) ?? 0) + 1);
    }
  }
  const misfits = [...problems.values()].reduce((sum, n) => sum + n, 0);
  const found = misfits === 1 ? "1 problem" : `${misfits} problems`;
  console.log(`${label}: ${fit} fit${misfits ? `, ${found}` : ""}`);
  for (const [where, count] of problems) console.log(`  ${where} (${count}x)`);
  return misfits === 0;
};

try {
  await mongoose.connect(databaseAccess, { dbName: process.env.DATABASE_NAME });
  console.log(`Checking database "${mongoose.connection.name}" (read only).`);
  // Every profile is sent as a User (GET /Login, POST /auth); its name is
  // also sent as an Author, which is part of a User
  const profilesFit = await check("Profiles", Profile.find().cursor(), User);
  // Every sentence is sent to its student as a Sentence (GET /MyPage)
  const sentencesFit = await check(
    "Sentences",
    Sentence.find().cursor(),
    SentenceAnswer
  );
  // Approved ones (Collections) and ones awaiting review (Admin) are also
  // sent with their author's name, as controllers/routes.ts fills it in. A
  // sentence whose author's profile is gone wouldn't fit.
  const withAuthorsFit = await check(
    "Sentences shown with their author",
    Sentence.find({ $or: [{ approved: true }, { toRedo: false }] })
      .populate("author", "firstName lastName -_id")
      .cursor(),
    SentenceWithAuthor
  );
  // Not a question of fitting the contract, but worth knowing: before #64 a
  // profile saved without an id got the placeholder "test". No Google account
  // has that id, so nobody can sign in as one; it would only be leftover data.
  const placeholders = await Profile.countDocuments({ id: "test" });
  console.log(`Profiles with the old placeholder id "test": ${placeholders}`);
  if (profilesFit && sentencesFit && withAuthorsFit) {
    console.log("Everything fits the contract.");
  } else {
    console.log("Some documents don't fit: requests that send them would fail.");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(messageOf(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
