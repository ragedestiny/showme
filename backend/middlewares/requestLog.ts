import { logger } from "firebase-functions/logger";

// Writes one log line for every request, once the answer has been sent:
//
//   GET /MyPage 200 in 35 ms   (plus method, path, status, durationMs, userId,
//                               version)
//
// The line is JSON, so Cloud Logging keeps each field separately and you can
// search by them (jsonPayload.status>=500, jsonPayload.path="/Admin") instead
// of matching text. One complete line per request, rather than lines scattered
// through the code, means one search answers "what happened to that request?".
//
// The logger also stamps the line with Google's trace id for the request, so
// the Logs Explorer shows it inside Cloud Run's own entry for that request.
//
// What never goes in: cookies, tokens, request bodies (students' sentences)
// and query strings. Logs are kept for 30 days and anyone with access to the
// Google Cloud project can read them.
const requestLog = (req, res, next) => {
  const start = performance.now();
  const { method, path } = req;

  res.on("finish", () => {
    const status = res.statusCode;
    const durationMs = Math.round(performance.now() - start);
    // A route that catches an error saves it here, so the line can say why
    // the request failed
    const error = res.locals.error;

    // write() instead of logger.error()/info(): those add a stack trace of
    // this line to ERROR messages, which would point here, not at the failure.
    logger.write({
      // ERROR = something broke on our side and needs a look. Not every 4xx:
      // a logged-out visitor gets a 401 from /Login on every visit.
      severity: error || status >= 500 ? "ERROR" : "INFO",
      message: `${method} ${path} ${status} in ${durationMs} ms`,
      method,
      path,
      status,
      durationMs,
      // Set by the auth middleware: the Google account id, not a name or email
      userId: req.userId,
      // Which deploy wrote the line: the git commit the deploy workflows put
      // in APP_VERSION (the same value /version answers). When something
      // starts failing, this shows which change it started with.
      version: process.env.APP_VERSION || "local",
      // Error Reporting reads stack_trace, groups the same failure together
      // and counts how often it happens
      ...(error && { error: error.message, stack_trace: error.stack }),
    });
  });

  next();
};

export default requestLog;
