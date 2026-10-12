import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyPage from "./MyPage";
import { OpenLoginContext } from "../components/loginPopup";
import { renderWithApp } from "../test/testUtils.jsx";

// Characterization tests: they record what MyPage does today, from a
// student's point of view, so the hooks rework can't change it unnoticed.

const ada = { id: "g-ada", firstName: "Ada", lastName: "Lovelace" };

// Tell sentences "Tell 1".."Tell N" for days 1..N
const tells = (n) =>
  Array.from({ length: n }, (_, i) => ({
    key: i + 1,
    title: `Day ${i + 1}`,
    tell: `Tell ${i + 1}`,
  }));

// The student's own sentences for days 1..n ("Show 1".."Show n")
const shows = (n) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `s${i + 1}`,
    title: `day${i + 1}`,
    tell: `Tell ${i + 1}`,
    show: `Show ${i + 1}`,
    hideedit: true,
    approved: false,
    toRedo: false,
  }));

// Draw MyPage for a signed-in Ada. The pretend server answers GET /MyPage
// with `mine`, and records every request in `requests`.
const renderMyPage = ({ tellCount = 12, mine = shows(2) } = {}) => {
  const requests = [];
  const respond = (config) => {
    requests.push(config);
    if (config.method === "get" && config.url === "/MyPage") {
      return { status: 200, data: mine };
    }
    if (config.method === "post" && config.url === "/MyPage") {
      return { status: 201, data: { _id: "new", ...JSON.parse(config.data) } };
    }
    if (config.method === "patch" && config.url === "/MyPage") {
      return { status: 201, data: JSON.parse(config.data) };
    }
    if (config.url === "/Login") return { status: 200, data: ada };
    return 200;
  };
  const view = renderWithApp(<MyPage />, {
    state: { user: ada, tellsentences: tells(tellCount), usersentences: mine },
    respond,
    route: "/MyPage",
  });
  return { ...view, requests };
};

const textbox = () => screen.getByPlaceholderText("Don't just tell me, instead SHOW ME!");
const submitButton = () => screen.getByRole("button", { name: "Show ME!" });
const listedShows = () =>
  screen.queryAllByText(/^Show \d+$/).map((el) => el.textContent);

describe("MyPage", () => {
  it("asks a visitor who isn't signed in to sign in, instead of showing an empty page", async () => {
    const openLogin = vi.fn();
    const requests = [];
    renderWithApp(
      <OpenLoginContext.Provider value={openLogin}>
        <MyPage />
      </OpenLoginContext.Provider>,
      {
        state: { user: {}, tellsentences: tells(12), usersentences: [] },
        route: "/MyPage",
        respond: (config) => {
          requests.push(config);
          return 401;
        },
      }
    );

    expect(screen.getByText(/sign in to write your own sentences/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(openLogin).toHaveBeenCalledTimes(1);
    // There's nobody to fetch sentences for, so the server isn't asked
    expect(requests).toHaveLength(0);
  });

  it("shows the next day and its tell sentence", async () => {
    renderMyPage({ mine: shows(2) });

    expect(await screen.findByText("Day 3")).toBeInTheDocument();
    expect(screen.getByText("Tell 3")).toBeInTheDocument();
  });

  it("lists the student's sentences, newest first", async () => {
    renderMyPage({ mine: shows(3) });

    await waitFor(() => expect(listedShows()).toEqual(["Show 3", "Show 2", "Show 1"]));
  });

  it("submitting sends the sentence, clears the box and moves to the next day", async () => {
    const user = userEvent.setup();
    const { requests } = renderMyPage({ mine: shows(2) });
    await screen.findByText("Day 3");

    await user.type(textbox(), "Brr, my fingers froze.");
    await user.click(submitButton());

    const post = await waitFor(() => {
      const found = requests.find((r) => r.method === "post" && r.url === "/MyPage");
      expect(found).toBeDefined();
      return found;
    });
    expect(JSON.parse(post.data)).toEqual({
      title: "day3",
      tell: "Tell 3",
      show: "Brr, my fingers froze.",
      hideedit: true,
    });
    expect(textbox()).toHaveValue("");
    expect(await screen.findByText("Day 4")).toBeInTheDocument();
    expect(screen.getByText("Tell 4")).toBeInTheDocument();
  });

  // The day comes from the list, and a save sent while the list is still on its
  // way can cross with it (a QA Wolf run recorded the list arriving with the
  // new sentence already in it, which then showed twice). So saving waits.
  it("lets the student save only once their list has arrived", async () => {
    let release;
    const list = new Promise((resolve) => (release = resolve));
    renderWithApp(<MyPage />, {
      state: { user: ada, tellsentences: tells(12), usersentences: [] },
      route: "/MyPage",
      respond: (config) => {
        if (config.method === "get" && config.url === "/MyPage") return list; // held back
        return { status: 200, data: ada };
      },
    });

    expect(submitButton()).toBeDisabled();

    release({ status: 200, data: shows(2) });

    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("disables the button while saving, so a double click can't submit twice", async () => {
    const user = userEvent.setup();
    let release;
    const answer = new Promise((resolve) => (release = resolve));
    const requests = [];
    renderWithApp(<MyPage />, {
      state: { user: ada, tellsentences: tells(12), usersentences: shows(2) },
      route: "/MyPage",
      respond: (config) => {
        requests.push(config);
        if (config.method === "post") return answer; // held back until release()
        if (config.url === "/MyPage") return { status: 200, data: shows(2) };
        return { status: 200, data: ada };
      },
    });
    await screen.findByText("Day 3");

    await user.type(textbox(), "First try");
    await user.click(submitButton());
    expect(submitButton()).toBeDisabled();
    await user.click(submitButton());
    expect(requests.filter((r) => r.method === "post")).toHaveLength(1);

    release({ status: 201, data: { _id: "new", title: "day3", show: "First try" } });
    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(await screen.findByText("Day 4")).toBeInTheDocument();
  });

  it("editing: hovering shows the pencil; saving sends the change and shows it", async () => {
    const user = userEvent.setup();
    const { requests } = renderMyPage({ mine: shows(2) });
    const item = (await screen.findByText("Show 2")).closest("form");
    const pencil = () => item.querySelector('[data-icon="pen-to-square"]');
    expect(pencil()).not.toBeVisible();

    await user.hover(item);
    expect(pencil()).toBeVisible();
    await user.click(pencil());

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Tell 2")).toBeInTheDocument();
    const box = within(dialog).getByRole("textbox");
    expect(box).toHaveValue("Show 2");
    await user.clear(box);
    await user.type(box, "Better 2");
    await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    const patch = await waitFor(() => {
      const found = requests.find((r) => r.method === "patch" && r.url === "/MyPage");
      expect(found).toBeDefined();
      return found;
    });
    expect(JSON.parse(patch.data)).toMatchObject({
      title: "day2",
      show: "Better 2",
      approved: false,
      toRedo: false,
    });
    expect(await screen.findByText("Better 2")).toBeInTheDocument();
  });

  it("ignores an empty submission", async () => {
    const user = userEvent.setup();
    const { requests } = renderMyPage();
    await screen.findByText("Day 3");

    await user.click(submitButton());

    expect(requests.some((r) => r.method === "post")).toBe(false);
    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("ignores a submission of only spaces and line breaks, so no day is used up", async () => {
    const user = userEvent.setup();
    const { requests } = renderMyPage();
    await screen.findByText("Day 3");

    await user.type(screen.getByRole("textbox"), "   {Enter}  ");
    await user.click(submitButton());

    expect(requests.some((r) => r.method === "post")).toBe(false);
    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("shows 8 sentences per page, with page buttons when there are more", async () => {
    const user = userEvent.setup();
    renderMyPage({ mine: shows(10) });

    await waitFor(() =>
      expect(listedShows()).toEqual([
        "Show 10", "Show 9", "Show 8", "Show 7", "Show 6", "Show 5", "Show 4", "Show 3",
      ])
    );
    const pager = screen.getByRole("list", { name: (_, el) => el.classList.contains("pagination") });
    expect(within(pager).getAllByRole("listitem")).toHaveLength(2);

    await user.click(within(pager).getByText("2"));

    await waitFor(() => expect(listedShows()).toEqual(["Show 2", "Show 1"]));
  });

  it("when every day is done, says come back later and blocks submitting", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { requests } = renderMyPage({ tellCount: 2, mine: shows(2) });

    expect(await screen.findByText("Come Back Later For More Sentences!")).toBeInTheDocument();

    await user.type(textbox(), "One more?");
    await user.click(submitButton());

    expect(alert).toHaveBeenCalled();
    expect(requests.some((r) => r.method === "post")).toBe(false);
  });
});
