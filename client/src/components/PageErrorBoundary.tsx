import React from "react";

// How each browser words "this page's file couldn't be downloaded"
// (Chrome / Firefox / Safari). Any other error is a bug in the page itself.
const isDownloadError = (error) =>
  /dynamically imported module|Importing a module script failed/i.test(
    error?.message ?? ""
  );

// A safety net around the page area. If a page crashes or its code can't be
// downloaded (e.g. the network dropped), show a message there instead of
// React removing the whole app and leaving a blank screen. The navbar stays,
// so the visitor can still go somewhere else.
// Pass the current address as `resetKey`: moving to another page clears the
// message. (Unlike a `key`, this keeps the same boundary, so React Router can
// keep showing the old page while the next one's code downloads.)
// (Error boundaries can only be written as classes; React has no hook for it.)
class PageErrorBoundary extends React.Component {
  state = { failed: false, failedAt: undefined, downloadFailed: false };

  static getDerivedStateFromError(error) {
    return { failed: true, downloadFailed: isDownloadError(error) };
  }

  // Remember which page failed; once the address changes, try again
  static getDerivedStateFromProps(props, state) {
    if (state.failed && state.failedAt === undefined) {
      return { failedAt: props.resetKey };
    }
    if (state.failed && props.resetKey !== state.failedAt) {
      return { failed: false, failedAt: undefined };
    }
    return null;
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="container text-center my-5">
        <p>
          {this.state.downloadFailed
            ? "Sorry, we couldn't load this page. Check your connection and try again."
            : "Sorry, something went wrong on this page. Refreshing may help."}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }
}

export default PageErrorBoundary;
