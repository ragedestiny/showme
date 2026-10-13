import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import About from "./About";
import { OpenLoginContext } from "../components/loginPopup";
import { renderWithApp } from "../test/testUtils";
import type { UserState } from "../reducers/user";

// "Join Us!" on the About page: a signed-in student goes to their page; a
// visitor who isn't signed in gets the sign-in pop-up (signing in then opens
// their page), instead of an empty page.

// Shows the current address
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

// Draw the About page for `user` ({} = not signed in), with a pretend
// "open the sign-in pop-up" that records each call
const renderAbout = (user: UserState) => {
  const openLogin = vi.fn();
  renderWithApp(
    <OpenLoginContext.Provider value={openLogin}>
      <About />
      <Where />
    </OpenLoginContext.Provider>,
    { state: { user }, route: "/about" }
  );
  return openLogin;
};

describe("About", () => {
  it("Join Us! opens the sign-in pop-up for a visitor who isn't signed in", async () => {
    const openLogin = renderAbout({});

    await userEvent.click(screen.getByRole("link", { name: "Join Us!" }));

    expect(openLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/about$/);
  });

  it("Join Us! takes a signed-in student to their page", async () => {
    const openLogin = renderAbout({ id: "g-ada", firstName: "Ada", lastName: "Lovelace" });

    await userEvent.click(screen.getByRole("link", { name: "Join Us!" }));

    expect(screen.getByTestId("where")).toHaveTextContent(/^\/MyPage$/);
    expect(openLogin).not.toHaveBeenCalled();
  });
});
