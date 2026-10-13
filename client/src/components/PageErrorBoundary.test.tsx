import { lazy, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PageErrorBoundary from "./PageErrorBoundary";

describe("PageErrorBoundary", () => {
  it("shows a message instead of a blank screen when a page's code can't be downloaded", async () => {
    // React reports the caught error to the console; keep the test output clean
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The message Chrome gives when a page's file can't be downloaded
    const BrokenPage = lazy(() =>
      Promise.reject(
        new TypeError("Failed to fetch dynamically imported module: /assets/Admin.js")
      )
    );

    render(
      <>
        <nav>Navbar</nav>
        <PageErrorBoundary>
          <Suspense fallback={null}>
            <BrokenPage />
          </Suspense>
        </PageErrorBoundary>
      </>
    );

    expect(
      await screen.findByText(/couldn't load this page/i)
    ).toBeInTheDocument();
    // The rest of the app (the navbar) is still there
    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("doesn't blame the connection when the page itself has a bug", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const BuggyPage = () => {
      throw new TypeError("Cannot read properties of undefined (reading 'map')");
    };

    render(
      <PageErrorBoundary>
        <BuggyPage />
      </PageErrorBoundary>
    );

    expect(screen.getByText(/something went wrong on this page/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });

  it("clears the message when the visitor moves to another page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const BrokenPage = lazy(() => Promise.reject(new Error("Failed to fetch")));

    const { rerender } = render(
      <PageErrorBoundary resetKey="/admin">
        <Suspense fallback={null}>
          <BrokenPage />
        </Suspense>
      </PageErrorBoundary>
    );
    await screen.findByText(/something went wrong|couldn't load this page/i);

    rerender(
      <PageErrorBoundary resetKey="/about">
        <p>About page</p>
      </PageErrorBoundary>
    );
    expect(screen.getByText("About page")).toBeInTheDocument();
    expect(
      screen.queryByText(/something went wrong|couldn't load this page/i)
    ).not.toBeInTheDocument();
  });

  it("shows the page normally when nothing goes wrong", () => {
    render(
      <PageErrorBoundary>
        <p>Hello</p>
      </PageErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
