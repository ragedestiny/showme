// The message of whatever a `catch` caught. Almost always an Error, but
// JavaScript lets code throw anything (a string, a number), so TypeScript
// can't promise there's a .message to read.
export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
