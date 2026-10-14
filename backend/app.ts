import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routerUrls from "./routes/routes.js";
import requestLog from "./middlewares/requestLog.js";

// Build the Express app without starting it or connecting to a database,
// so tests can import it and supply their own throwaway database.
const app = express();

// First, so every request gets a log line, including ones answered early
// (static files, the size check below).
app.use(requestLog);

app.use(express.static("public"));

// A sentence is a few hundred bytes; 1mb leaves plenty of room while stopping
// anyone from tying up the server with huge requests.
const MAX_BODY_BYTES = 1024 * 1024;

// On Cloud Functions, Firebase reads the body before this app runs, so the
// limits on express.json()/urlencoded() below never get a chance to apply.
// Every normal request declares its size in Content-Length, so check that first.
app.use((req, res, next) => {
  if (Number(req.headers["content-length"]) > MAX_BODY_BYTES) {
    return res.status(413).json({ message: "Request too large" });
  }
  next();
});

// Turn the request's text body into req.body. Express has this built in.
// (Outside Cloud Functions, e.g. in tests, these limits apply as well.)
app.use(express.json({ limit: MAX_BODY_BYTES }));
app.use(express.urlencoded({ limit: MAX_BODY_BYTES, extended: true }));
app.use(cors());
// Turns the browser's "Cookie: a=1; b=2" header into req.cookies = { a, b }
app.use(cookieParser());

// '/' will the be the start of all routes
app.use("/", routerUrls);

export default app;
