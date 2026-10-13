import React from "react";
import LoadingOverlay from "react-loading-overlay-ts";

// Shown while a page's code is still downloading. It is the same "Loading..."
// overlay the pages show while their data loads (so a refresh shows one
// loader from start to finish), and as tall as a page (the page-loading
// class), so the footer stays at the bottom instead of jumping up.
const PageLoading = () => <LoadingOverlay active spinner text="Loading..." className="page-loading" />;

export default PageLoading;
