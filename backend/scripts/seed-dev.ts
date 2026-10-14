// Fills the PRACTICE database with made-up students and sentences, so every
// page (Collections, Admin, MyPage) has something to show during local testing.
//
//   npm run seed:dev                      add/refresh the sample data
//   npm run seed:dev -- --admin <email>   also make that practice profile an admin
//
// Safety lock: it only runs when DATABASE_NAME (from .env.local) names a
// database other than the production one, and it only ever deletes the sample
// data it created itself (emails ending in @seed.example).
// Settings come from Node's built-in --env-file flags in package.json:
// .env first, then .env.local, whose DATABASE_NAME wins.
import mongoose from "mongoose";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import tellList from "../public/tellList.js";

const PRODUCTION_DB = "ShowME";
const SEED_DOMAIN = "@seed.example";

const dbName = process.env.DATABASE_NAME;
if (!dbName || dbName === PRODUCTION_DB) {
  console.error(
    `Refusing to run: DATABASE_NAME is "${dbName ?? "(not set)"}". ` +
      "Set DATABASE_NAME=ShowME-dev in .env.local so this can never touch production."
  );
  process.exit(1);
}

// Made-up students. `id` plays the part of the Google account id.
const students = [
  { id: "seed-mia", firstName: "Mia", lastName: "Torres" },
  { id: "seed-leo", firstName: "Leo", lastName: "Chen" },
  { id: "seed-ava", firstName: "Ava", lastName: "Patel" },
  { id: "seed-noah", firstName: "Noah", lastName: "Kim" },
];

// [student id, day, show sentence, state]
//   approved -> shows in Collections
//   pending  -> waits in the Admin review queue
//   redo     -> sent back to the student
const sentences = [
  ["seed-mia", 1, "Frost crawled across the window as my breath hung in the air like a ghost.", "approved"],
  ["seed-mia", 2, "The sidewalk shimmered, and my ice cream surrendered before I could take a bite.", "approved"],
  ["seed-mia", 3, "Mountains of socks blocked the doorway, and a forgotten sandwich had grown fur.", "approved"],
  ["seed-mia", 4, "Every book stood in a straight line, and the carpet still had vacuum stripes.", "pending"],
  ["seed-leo", 1, "My fingers went numb inside my gloves before I reached the bus stop.", "approved"],
  ["seed-leo", 2, "Sweat dripped off my nose and sizzled on the burning pavement.", "approved"],
  ["seed-leo", 3, "His room is very messy.", "redo"],
  ["seed-ava", 1, "Icicles hung from the roof like a row of glass teeth.", "approved"],
  ["seed-ava", 2, "The dog refused to leave the shade, panting like he had run a marathon.", "approved"],
  ["seed-ava", 3, "I had to climb over a hill of laundry just to find his bed.", "pending"],
  ["seed-ava", 4, "You could see your reflection in her desk, and her pencils were sorted by color.", "pending"],
  ["seed-noah", 1, "Our car would not start, and the snow reached the top of the tires.", "approved"],
  ["seed-noah", 2, "It is really really hot.", "redo"],
  ["seed-noah", 5, "We needed a map to find the kitchen, and the hallway echoed when I sneezed.", "pending"],
];

const seed = async () => {
  // Remove the previous run's sample data (and only that), so re-running is safe.
  const old = await Profile.find({ email: { $regex: `${SEED_DOMAIN}$` } });
  await Sentence.deleteMany({ GID: { $in: old.map((p) => p.id) } });
  await Profile.deleteMany({ _id: { $in: old.map((p) => p._id) } });

  const profiles = {};
  for (const s of students) {
    profiles[s.id] = await Profile.create({
      ...s,
      email: `${s.firstName.toLowerCase()}${SEED_DOMAIN}`,
    });
  }

  // Spread creation times over the last few weeks so "newest first" sorting
  // has something to sort.
  const now = Date.now();
  for (const [index, [studentId, day, show, state]] of sentences.entries()) {
    const author = profiles[studentId];
    const sentence = await Sentence.create({
      title: `day${day}`,
      tell: tellList[day - 1].tell,
      show,
      author: author._id,
      GID: author.id,
      approved: state === "approved",
      toRedo: state === "redo",
      createdAt: new Date(now - (sentences.length - index) * 36 * 60 * 60 * 1000),
    });
    author.ownSentences.push(sentence._id);
  }
  await Promise.all(Object.values(profiles).map((p) => p.save()));

  const count = (state) => sentences.filter((s) => s[3] === state).length;
  console.log(
    `Seeded ${students.length} students: ${count("approved")} approved, ` +
      `${count("pending")} waiting for review, ${count("redo")} sent back.`
  );
};

const makeAdmin = async (email) => {
  const result = await Profile.updateOne({ email }, { $set: { isAdmin: true } });
  if (result.matchedCount === 0) {
    console.error(`No profile with email ${email} in ${dbName}. Log in once locally first.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an admin in ${dbName}.`);
  }
};

try {
  await mongoose.connect(process.env.DATABASE_ACCESS, { dbName });
  console.log(`Connected to database "${mongoose.connection.name}".`);
  await seed();
  const adminFlag = process.argv.indexOf("--admin");
  if (adminFlag !== -1) {
    await makeAdmin(process.argv[adminFlag + 1]);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
