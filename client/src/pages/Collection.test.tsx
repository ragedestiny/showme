import { afterEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Collection from "./Collection";
import { renderWithApp } from "../test/testUtils";

// Characterization tests for the Collections page: what a visitor sees.

const tellsentences = [{ key: 1, title: "Day 1", tell: "It is cold outside.", image: "/cold.jpg" }];

// Approved sentences, newest first (the order the server sends them in)
const fromServer = (n) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `id-${i + 1}`,
    title: "day1",
    tell: "It is cold outside.",
    show: `Sentence ${i + 1}`,
    author: { firstName: "Ada", lastName: "Lovelace" },
  }));

const shownOrder = () => screen.queryAllByText(/^Sentence \d+$/).map((el) => el.textContent);

// `server`: the list the server sends, or a function giving each answer in turn
// (a status, "offline", or { status, data })
const renderCollection = ({ server = fromServer(6), remembered = [] } = {}) => {
  let calls = 0;
  return renderWithApp(<Collection />, {
    // `remembered`: an old list redux-persist may have restored
    state: { tellsentences, approvedsentences: remembered },
    route: "/Collections",
    respond: (config) => {
      if (config.url !== "/Collections") return 200;
      calls += 1;
      return typeof server === "function" ? server(calls) : { status: 200, data: server };
    },
  });
};

const pickSort = async (user, choice) => {
  await user.click(screen.getByRole("button", { name: /random|newest/i }));
  await user.click(within(await screen.findByRole("menu")).getByText(choice));
};

afterEach(() => {
  delete window.earlyRequests;
});

describe("Collection", () => {
  it("shows the approved sentences from the server", async () => {
    renderCollection({ server: fromServer(6) });

    await waitFor(() => expect(shownOrder()).toHaveLength(6));
    expect(shownOrder().sort()).toEqual(fromServer(6).map((s) => s.show).sort());
  });

  it("shows the sentences index.html already asked for, without asking again", async () => {
    // On a fresh load, index.html starts this request before the app's code
    // arrives (see vite.config.ts). The app's own request would fail here.
    window.earlyRequests = {
      "/Collections": Promise.resolve({ ok: true, status: 200, json: async () => fromServer(4) }),
    };
    renderCollection({ server: () => "offline" });

    await waitFor(() => expect(shownOrder()).toHaveLength(4));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the fresh list from the server, not an old one remembered by the browser", async () => {
    const old = [{ ...fromServer(1)[0], _id: "old", show: "Sentence 99" }];
    renderCollection({ server: fromServer(3), remembered: old });

    await waitFor(() => expect(shownOrder()).toHaveLength(3));
    expect(screen.queryByText("Sentence 99")).not.toBeInTheDocument();
  });

  it("starts on Random, and Newest shows the server's newest-first order", async () => {
    const user = userEvent.setup();
    renderCollection({ server: fromServer(6) });
    await waitFor(() => expect(shownOrder()).toHaveLength(6));
    expect(screen.getByRole("button", { name: /random/i })).toBeInTheDocument();

    await pickSort(user, "Newest");

    await waitFor(() =>
      expect(shownOrder()).toEqual(fromServer(6).map((s) => s.show))
    );
  });

  it("Random keeps the same sentences, in some order", async () => {
    const user = userEvent.setup();
    renderCollection({ server: fromServer(6) });
    await waitFor(() => expect(shownOrder()).toHaveLength(6));

    await pickSort(user, "Newest");
    await pickSort(user, "Random");

    await waitFor(() => expect(shownOrder()).toHaveLength(6));
    expect(shownOrder().sort()).toEqual(fromServer(6).map((s) => s.show).sort());
  });

  it("says so, with a Try again button, when the collection can't be loaded", async () => {
    renderCollection({ server: () => "offline" });

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/couldn't load the collection/i);
    expect(within(message).getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(shownOrder()).toHaveLength(0);
  });

  it("Try again loads the collection again", async () => {
    const user = userEvent.setup();
    renderCollection({ server: (call) => (call === 1 ? 500 : { status: 200, data: fromServer(3) }) });

    await user.click(await screen.findByRole("button", { name: /try again/i }));

    await waitFor(() => expect(shownOrder()).toHaveLength(3));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never brings back an old list remembered by the browser when loading fails", async () => {
    const old = [{ ...fromServer(1)[0], _id: "old", show: "Sentence 99" }];
    renderCollection({ server: () => "offline", remembered: old });

    await screen.findByRole("alert");
    expect(screen.queryByText("Sentence 99")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /random|newest/i })).not.toBeInTheDocument();
  });

  it("says when no sentences have been approved yet", async () => {
    renderCollection({ server: [] });

    expect(await screen.findByText(/no sentences have been approved yet/i)).toBeInTheDocument();
  });
});
