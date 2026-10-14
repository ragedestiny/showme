// What this app adds to Express's requests and responses, so TypeScript
// knows about them everywhere
declare global {
  namespace Express {
    interface Request {
      // Set by the auth middleware (middlewares/auth.ts): the signed-in
      // user's Google account id
      userId?: string;
    }
    interface Locals {
      // A route that catches an error saves it here, so the request's log
      // line can say why it failed (middlewares/requestLog.ts)
      error?: unknown;
    }
  }
}

export {};
