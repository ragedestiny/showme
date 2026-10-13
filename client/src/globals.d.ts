// Things the code uses that TypeScript can't find out about on its own

interface ImportMetaEnv {
  // The app's id for Google's sign-in button. Set in Netlify's environment
  // variables (and in .env for local development), not in the code.
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface Window {
  // Requests the script in index.html starts before the app's code has
  // downloaded, by API address (see vite.config.ts and src/api/index.ts)
  earlyRequests?: Record<string, Promise<Response>>;
}
