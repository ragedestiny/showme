// Runs before every test file.
import { afterAll, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Readable checks such as expect(element).toBeInTheDocument()
import "@testing-library/jest-dom/vitest";

// Wipe the pretend screen after each test so tests can't affect each other.
afterEach(() => {
  cleanup();
});

// react-bootstrap ends each slide or fade with a short timer (5 ms here, as
// tests load no CSS) that keeps running after the component is removed. One
// that fires after the file's pretend browser is gone fails the whole run
// with "document is not defined", so give such timers a moment to finish
// first. Timers run in the order they're due, so 50 ms is plenty.
afterAll(() => new Promise((resolve) => setTimeout(resolve, 50)));
