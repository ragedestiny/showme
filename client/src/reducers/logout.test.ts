import { describe, expect, it } from "vitest";
import reducers from "./index";

// The whole app state while someone is logged in.
const loggedInState = {
  user: { firstName: "Ada", isAdmin: true },
  usersentences: [{ title: "day1", show: "Ada's sentence" }],
  approvalsentences: [{ title: "day1", show: "Waiting for review" }],
  tellsentences: [{ title: "Day 1", tell: "It is cold outside." }],
  approvedsentences: [{ title: "day1", show: "Public sentence" }],
};

describe("one LOGOUT action", () => {
  const after = reducers(loggedInState, { type: "LOGOUT" });

  it("forgets the user", () => {
    expect(after.user).toEqual({});
  });

  it("clears the user's own sentences", () => {
    expect(after.usersentences).toEqual([]);
  });

  it("clears the admin review queue, so the next person can't see it", () => {
    expect(after.approvalsentences).toEqual([]);
  });

  it("keeps public data that everyone can see anyway", () => {
    expect(after.tellsentences).toEqual(loggedInState.tellsentences);
    expect(after.approvedsentences).toEqual(loggedInState.approvedsentences);
  });
});
