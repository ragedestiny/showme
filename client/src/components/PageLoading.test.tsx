import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PageLoading from "./PageLoading";

// Shown while a page's code is still downloading. It must look like the
// "Loading..." overlay the pages show while their data loads, and be as tall
// as a page, so the footer stays at the bottom instead of jumping up.

describe("PageLoading", () => {
  it("shows the same Loading... overlay the pages use", () => {
    render(<PageLoading />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(document.querySelector("._loading_overlay_overlay")).toBeInTheDocument();
  });

  it("is as tall as a page (the page-loading class), so the footer stays at the bottom", () => {
    render(<PageLoading />);

    expect(document.querySelector("._loading_overlay_wrapper")).toHaveClass("page-loading");
  });
});
