import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import Admin from "./Admin";
import { checkSession } from "../actions/user";
import { renderWithApp } from "../test/testUtils";

// Characterization tests for the Admin review page, before upgrading the
// MDB and Font Awesome libraries it uses.

const waiting = [
  { _id: "a", title: "day1", tell: "It is cold outside.", show: "Frost bit my fingers.", author: { firstName: "Mia", lastName: "Torres" } },
  { _id: "b", title: "day2", tell: "It is hot outside.", show: "The road shimmered.", author: { firstName: "Leo", lastName: "Chen" } },
];

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

// `user` is who the browser remembers; `sessionChecked` says whether the server
// has already confirmed who is logged in; `login` is the server's answer to
// GET /Login (a promise holds it back until the test releases it).
const renderAdmin = ({
  user = { firstName: "Grace", isAdmin: true },
  sessionChecked = true,
  login = { status: 200, data: user },
  afterUpdate = [waiting[1]],
} = {}) => {
  const requests = [];
  const view = renderWithApp(
    <Routes>
      <Route path="*" element={<><Admin /><Where /></>} />
    </Routes>,
    {
      state: { user, session: { checked: sessionChecked }, approvalsentences: [] },
      route: "/admin",
      respond: (config) => {
        requests.push(config);
        if (config.url === "/Login") return login;
        if (config.method === "get" && config.url === "/Admin") return { status: 200, data: waiting };
        if (config.method === "patch" && config.url === "/Admin") return { status: 201, data: afterUpdate };
        return 200;
      },
    }
  );
  return { ...view, requests };
};

const student = { firstName: "Test", isAdmin: false };
const admin = { firstName: "Test", isAdmin: true };

const rows = () => [...document.querySelectorAll("tbody tr")];

describe("Admin", () => {
  it("sends a non-admin back to the home page", async () => {
    renderAdmin({ user: { firstName: "Ada", isAdmin: false } });

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
    expect(screen.queryByText("Sentences Awaiting Approval")).not.toBeInTheDocument();
  });

  // What QA Wolf runs recorded: the browser still remembered the student who
  // used it a moment earlier when an admin logged in and opened /admin. The page
  // judged by that memory and sent the admin home before the server's "this is
  // the admin" arrived (641 ms later).
  it("waits for the server before judging, so a remembered student can't send an admin away", async () => {
    let release;
    const login = new Promise((resolve) => (release = resolve));
    const { store } = renderAdmin({ user: student, sessionChecked: false, login });

    // The app asks the server who is logged in (App.tsx does this on startup)
    const checking = store.dispatch(checkSession());
    expect(screen.getByTestId("where")).toHaveTextContent("/admin");
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    release({ status: 200, data: admin });
    await checking;

    expect(await screen.findByText("Sentences Awaiting Approval")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/admin");
  });

  it("sends a student home once the server confirms they aren't an admin", async () => {
    const { store } = renderAdmin({ user: student, sessionChecked: false });

    await store.dispatch(checkSession());

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/$/));
  });

  it("lists each waiting sentence with its student, show and tell sentence", async () => {
    renderAdmin();

    expect(await screen.findByText("Mia Torres")).toBeInTheDocument();
    expect(screen.getByText("Frost bit my fingers.")).toBeInTheDocument();
    expect(screen.getByText("It is cold outside.")).toBeInTheDocument();
    expect(screen.getByText("Leo Chen")).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
  });

  it("approving a row sends that row's sentence, then shows the updated queue", async () => {
    const { requests } = renderAdmin({ afterUpdate: [waiting[1]] });
    await screen.findByText("Mia Torres");

    fireEvent.click(rows()[0].querySelector(".fa-check"));

    const patch = await waitFor(() => {
      const found = requests.find((r) => r.method === "patch");
      expect(found).toBeDefined();
      return found;
    });
    expect(JSON.parse(patch.data)).toEqual({ status: "approve", sentence: waiting[0] });
    await waitFor(() => expect(screen.queryByText("Mia Torres")).not.toBeInTheDocument());
    expect(rows()).toHaveLength(1);
  });

  it("sending a row back sends 'redo' with that row's sentence", async () => {
    const { requests } = renderAdmin({ afterUpdate: [waiting[0]] });
    await screen.findByText("Leo Chen");

    fireEvent.click(rows()[1].querySelector(".fa-rotate-right"));

    const patch = await waitFor(() => {
      const found = requests.find((r) => r.method === "patch");
      expect(found).toBeDefined();
      return found;
    });
    expect(JSON.parse(patch.data)).toEqual({ status: "redo", sentence: waiting[1] });
  });

  // A second, later answer can land right after an approval and bring back a
  // queue from before it (a QA Wolf run recorded two requests sent together)
  it("asks for the queue once when the login check confirms an admin", async () => {
    const { store, requests } = renderAdmin({ user: student, sessionChecked: false, login: { status: 200, data: admin } });

    await store.dispatch(checkSession());
    await screen.findByText("Mia Torres"); // the queue has arrived

    expect(requests.filter((r) => r.method === "get" && r.url === "/Admin")).toHaveLength(1);
  });

  // What a QA Wolf run recorded: the queue grew (other students' sentences
  // arrived) just as the admin clicked approve on a row, and the sentence that
  // had moved into that row's place was approved instead.
  it("approves the sentence in the row that was clicked, even if the queue changed just before", async () => {
    const { store, requests } = renderAdmin();
    await screen.findByText("Leo Chen");
    const leosApprove = rows()[1].querySelector(".fa-check"); // the admin aims at Leo's row

    const newer = { _id: "c", title: "day1", tell: "It is cold outside.", show: "Ice cracked underfoot.", author: { firstName: "Ana", lastName: "Ruiz" } };
    store.dispatch({ type: "FETCH_APPROVAL", payload: [newer, ...waiting] }); // Ana's arrives on top
    await waitFor(() => expect(rows()).toHaveLength(3)); // the table has redrawn
    fireEvent.click(leosApprove);

    const patch = await waitFor(() => {
      const found = requests.find((r) => r.method === "patch");
      expect(found).toBeDefined();
      return found;
    });
    expect(JSON.parse(patch.data).sentence.show).toBe("The road shimmered.");
  });

  // The database doesn't require a last name (older accounts, and Google
  // accounts without one)
  it("shows just the first name of a student who has no last name", async () => {
    const { store } = renderAdmin();
    await screen.findByText("Mia Torres"); // the queue has arrived

    store.dispatch({
      type: "FETCH_APPROVAL",
      payload: [{ ...waiting[0], author: { firstName: "Bo" } }],
    });

    expect(await screen.findByText("Bo")).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
