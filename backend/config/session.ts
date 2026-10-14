// Everything about the login session lives here, so the token and the cookie
// can never disagree about how long a login lasts.
import type { CookieOptions } from "express";

// How long a login lasts before the user must sign in again.
export const SESSION_SECONDS = 60 * 60; // 1 hour

export const SESSION_COOKIE = "session";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the page can't read it (protects against XSS)
  secure: true, // only sent over https (browsers also allow http://localhost)
  sameSite: "lax", // not sent on requests other websites trigger (protects against CSRF)
  path: "/", // sent with every request to our site
};

// The secret that signs and checks login tokens (JWT_SECRET, from .env).
// Read each time, not once at startup, so tests can set their own. Without
// one, signing or checking a token fails (as the library itself would).
export const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};
