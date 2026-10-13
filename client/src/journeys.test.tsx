import { beforeAll, describe, expect, it, onTestFinished } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "./reducers";
import { API } from "./api";
import { setupInterceptors } from "./api/interceptors";
import { fakeNetwork } from "./test/testUtils";
import App from "./components/App";

// Whole-app journeys: the real App (menu, pages, and the login check it starts
// with) and the real 401 rule, with only the network pretend. Page tests draw
// one page on its own; the bugs these guard against lived between the pieces:
// the login check, what the browser remembered, and a page reacting to both.
// Each server answer can be held back and released when the test chooses, so
// the timing that made QA Wolf's runs flaky happens on every run here.

// Draw the app as a visitor opening `url` sees it, starting from what this
// browser remembered (`state`). `respond(config)` answers each request.
const openApp = ({ url, state = {}, respond }) => {
  const requests = [];
  const store = configureStore({ reducer: reducers, preloadedState: state });
  API.defaults.adapter = fakeNetwork(async (config) => {
    requests.push(config);
    const outcome = await respond(config);
    // Every answer arrives as a fresh copy, as it does over a real network
    // (JSON), never as the very object the test or the store already holds
    return outcome?.data === undefined
      ? outcome
      : { ...outcome, data: JSON.parse(JSON.stringify(outcome.data)) };
  });
  const interceptorId = setupInterceptors(store);
  onTestFinished(() => API.interceptors.response.eject(interceptorId));
  window.history.replaceState(null, "", url);
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  const sent = (method, url) => requests.filter((r) => r.method === method && r.url === url);
  return { store, requests, sent };
};

// A server answer the test releases when it chooses
const heldAnswer = () => {
  let release;
  const answer = new Promise((resolve) => (release = resolve));
  return { answer, release };
};

// Let everything already set in motion finish (redraws, and the effects and
// requests they start), so counting requests afterwards is final
const settle = () => act(async () => {});

const where = () => window.location.pathname;

const tells = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, title: `Day ${i + 1}`, tell: `Tell ${i + 1}` }));
const student = { id: "test-student", firstName: "Test", lastName: "Student", isAdmin: false };
const admin = { id: "test-admin", firstName: "Test", lastName: "Admin", isAdmin: true };
const pending = (id, show, firstName) => ({
  _id: id,
  title: "day1",
  tell: "Tell 1",
  show,
  author: { firstName, lastName: "Student" },
});
const mia = pending("a", "Frost bit my fingers.", "Mia");
const leo = pending("b", "The road shimmered.", "Leo");

// Pages download their code on first use; load them once up front so the
// first test doesn't spend its time waiting for that
beforeAll(async () => {
  await Promise.all([import("./pages/Admin"), import("./pages/MyPage")]);
});

describe("an admin opening the review page", () => {
  // QA Wolf, Oct 7 and 9: a student used the browser, then an admin logged in.
  // The page judged by the remembered student and sent the admin home.
  // QA Wolf, Oct 12: the queue was then asked for twice at once.
  it("in a browser a student just used: stays, shows the queue, and asks for it once", async () => {
    const login = heldAnswer();
    const { store, sent } = openApp({
      url: "/admin",
      state: { user: student },
      respond: (config) => {
        if (config.url === "/Login") return login.answer;
        if (config.url === "/Admin") return { status: 200, data: [mia, leo] };
        return { status: 200, data: tells };
      },
    });

    // Waiting for the server's answer: no redirect, no queue yet
    await settle();
    expect(where()).toBe("/admin");
    expect(screen.queryByText("Sentences Awaiting Approval")).not.toBeInTheDocument();

    login.release({ status: 200, data: admin });

    expect(await screen.findByText("Mia Student")).toBeInTheDocument();
    await waitFor(() => expect(store.getState().session.checked).toBe(true));
    await settle();
    expect(where()).toBe("/admin");
    expect(sent("get", "/Admin")).toHaveLength(1);
  });

  it("when the browser remembers the admin: asks for the queue once, also after the login check", async () => {
    const { store, sent } = openApp({
      url: "/admin",
      state: { user: admin },
      respond: (config) => {
        if (config.url === "/Login") return { status: 200, data: admin };
        if (config.url === "/Admin") return { status: 200, data: [mia, leo] };
        return { status: 200, data: tells };
      },
    });

    expect(await screen.findByText("Leo Student")).toBeInTheDocument();
    await waitFor(() => expect(store.getState().session.checked).toBe(true));
    await settle();
    expect(sent("get", "/Admin")).toHaveLength(1);
  });

  // QA Wolf, Oct 12: the queue changed just as a click was aimed at a row, and
  // the sentence that moved into that row's place was approved instead
  it("approving acts on the clicked row's sentence, even when the queue changed in between", async () => {
    const ana = pending("c", "Ice cracked underfoot.", "Ana");
    const sam = pending("d", "Steam curled off the road.", "Sam");
    const { sent } = openApp({
      url: "/admin",
      state: { user: admin },
      respond: (config) => {
        if (config.url === "/Login") return { status: 200, data: admin };
        if (config.method === "get" && config.url === "/Admin") return { status: 200, data: [mia, leo] };
        // Approving Mia's comes back with two newer sentences on top
        if (config.method === "patch") return { status: 201, data: [ana, sam, leo] };
        return { status: 200, data: tells };
      },
    });
    await screen.findByText("Leo Student");
    const rowOf = (name) => screen.getByText(name).closest("tr");
    const leosApprove = rowOf("Leo Student").querySelector(".fa-check"); // aimed at Leo's row

    fireEvent.click(rowOf("Mia Student").querySelector(".fa-check"));
    await screen.findByText("Sam Student"); // the queue has changed
    fireEvent.click(leosApprove);

    await waitFor(() => expect(sent("patch", "/Admin")).toHaveLength(2));
    const [first, second] = sent("patch", "/Admin").map((r) => JSON.parse(r.data).sentence.show);
    expect(first).toBe(mia.show);
    expect(second).toBe(leo.show);
  });
});

describe("pages that need a login", () => {
  it("a student opening /admin is sent home once the server confirms who they are", async () => {
    openApp({
      url: "/admin",
      state: { user: student },
      respond: (config) => {
        if (config.url === "/Login") return { status: 200, data: student };
        return { status: 200, data: tells };
      },
    });

    await waitFor(() => expect(where()).toBe("/"));
    expect(screen.queryByText("Sentences Awaiting Approval")).not.toBeInTheDocument();
  });

  it("a logged-out visitor opening /admin is sent home once the server says nobody is logged in", async () => {
    openApp({
      url: "/admin",
      respond: (config) => (config.url === "/Login" ? 401 : { status: 200, data: tells }),
    });

    await waitFor(() => expect(where()).toBe("/"));
    expect(screen.queryByText("Sentences Awaiting Approval")).not.toBeInTheDocument();
  });
});

describe("a student writing on MyPage", () => {
  // QA Wolf, Oct 7: a save sent while the list was still on its way crossed
  // with it, and the sentence showed twice (the next save would be "day3").
  // The browser's remembered list can also be out of date (here it knows only
  // day 1; the server has two days), so the day number must wait for the server.
  it("can save only once the list has arrived, then saves the right day and shows it once", async () => {
    const user = userEvent.setup();
    const list = heldAnswer();
    const day1 = { _id: "s1", title: "day1", tell: "Tell 1", show: "Show 1" };
    const day2 = { _id: "s2", title: "day2", tell: "Tell 2", show: "Show 2" };
    const { sent } = openApp({
      url: "/MyPage",
      state: { user: student, tellsentences: tells, usersentences: [day1] },
      respond: (config) => {
        if (config.url === "/Login") return { status: 200, data: student };
        if (config.method === "get" && config.url === "/MyPage") return list.answer;
        if (config.method === "post" && config.url === "/MyPage") {
          return { status: 201, data: { _id: "s3", ...JSON.parse(config.data) } };
        }
        return { status: 200, data: tells };
      },
    });
    const button = await screen.findByRole("button", { name: "Show ME!" });
    expect(button).toBeDisabled();

    list.release({ status: 200, data: [day1, day2] });

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText("Day 3")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Don't just tell me, instead SHOW ME!"), "Show 3");
    await user.click(button);

    expect(await screen.findByText("Day 4")).toBeInTheDocument();
    expect(JSON.parse(sent("post", "/MyPage")[0].data).title).toBe("day3");
    expect(screen.getAllByText("Show 3")).toHaveLength(1);
  });
});
