import { describe, expect, it } from "vitest";
import reducers from "./index";
import type { RootState } from "./types";

// What every sentence below shares
const day1 = {
  _id: "s1",
  title: "day1",
  tell: "It is cold outside.",
  approved: false,
  toRedo: false,
  createdAt: "2026-10-01T00:00:00.000Z",
};
const author = { firstName: "Ada", lastName: "Lovelace" };

// The whole app state while someone is logged in.
const loggedInState: Partial<RootState> = {
  user: { firstName: "Ada", isAdmin: true },
  usersentences: [{ ...day1, show: "Ada's sentence" }],
  approvalsentences: [{ ...day1, show: "Waiting for review", author }],
  tellsentences: [{ key: 1, title: "Day 1", tell: "It is cold outside.", image: "/cold.jpg" }],
  approvedsentences: [{ ...day1, show: "Public sentence", author }],
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
