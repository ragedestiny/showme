import type { ZodError } from "zod";

// The message of whatever a `catch` caught. Almost always an Error, but
// JavaScript lets code throw anything (a string, a number), so TypeScript
// can't promise there's a .message to read.
export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// What to tell the sender of a request the contract refused
// (contract/api.ts): the first problem found, in the order the contract
// lists the fields
export const firstProblem = (error: ZodError): string =>
  error.issues[0]?.message ?? "Invalid request";
