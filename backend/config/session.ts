// Everything about the login session lives here, so the token and the cookie
// can never disagree about how long a login lasts.

// How long a login lasts before the user must sign in again.
export const SESSION_SECONDS = 60 * 60; // 1 hour

export const SESSION_COOKIE = "session";

export const sessionCookieOptions = {
  httpOnly: true, // JavaScript in the page can't read it (protects against XSS)
  secure: true, // only sent over https (browsers also allow http://localhost)
  sameSite: "lax", // not sent on requests other websites trigger (protects against CSRF)
  path: "/", // sent with every request to our site
};
