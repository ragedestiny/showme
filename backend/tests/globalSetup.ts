import { MongoBinary } from "mongodb-memory-server";

// Runs once, before any test file starts. Each test file (in its own process)
// starts its own MongoDB from the same downloaded mongod program. If that
// program isn't downloaded yet, several processes try to download it at once
// and trip over each other's lock file. Getting it here first, while nothing
// else is running, means the test files always find it ready.
export default async function setup() {
  await MongoBinary.getPath();
}
