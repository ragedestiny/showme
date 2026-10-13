import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import NavbarComp from "./NavbarComp";
import { renderWithApp } from "../test/testUtils";

// Going to /login directly (an old bookmark, or typing the address) must open
// the sign-in pop-up over the home page, like the navbar's Login link does,
// instead of showing an empty page. Pages can open the same pop-up: About's
// "Join Us!" and MyPage's "Sign in", for visitors who aren't signed in.

// The app loads each page's code on demand. In a busy test run that can take
// over a second, longer than the tests wait for the page, so load it up front.
beforeAll(() =>
  Promise.all([import("../pages/About"), import("../pages/Login"), import("../pages/MyPage")])
);

beforeEach(() => {
  // A pretend Google sign-in script, for the pop-up's button
  vi.stubGlobal("google", {
    accounts: { id: { initialize: vi.fn(), renderButton: vi.fn(), prompt: vi.fn() } },
  });
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Shows the current address
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

describe("NavbarComp", () => {
  it("opens the sign-in pop-up over the home page when visiting /login", async () => {
    renderWithApp(
      <>
        <NavbarComp />
        <Where />
      </>,
      { route: "/login", respond: () => 401 }
    );

    expect(await screen.findByText("Sign in with Google")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
  });

  it("opens the sign-in pop-up from About's Join Us! when not signed in, staying on About", async () => {
    renderWithApp(
      <>
        <NavbarComp />
        <Where />
      </>,
      { route: "/about", respond: () => 401 }
    );

    await userEvent.click(await screen.findByRole("link", { name: "Join Us!" }));

    expect(await screen.findByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/about$/);
  });

  it("opens the sign-in pop-up from MyPage's Sign in button when not signed in", async () => {
    renderWithApp(<NavbarComp />, { route: "/MyPage", respond: () => 401 });

    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Sign in with Google")).toBeInTheDocument();
  });
});
