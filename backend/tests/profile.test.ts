import { describe, expect, it } from "vitest";
import Profile from "../models/profile.js";

// Everything a new profile needs apart from its Google account id
const student = { firstName: "Ada", email: "ada@example.com" };

describe("Profile model", () => {
  // The app finds a student's profile by their Google account id and puts it
  // in their login token. A profile saved without one used to get the
  // made-up id "test" instead, so it belonged to no Google account.
  it.each([
    ["no Google account id", {}],
    ["an empty Google account id", { id: "" }],
  ])("refuses to save a profile with %s", async (_, fields) => {
    await expect(Profile.create({ ...student, ...fields })).rejects.toThrow(
      "Path `id` is required"
    );
    expect(await Profile.countDocuments()).toBe(0);
  });

  it("saves a profile with the Google account id it was given", async () => {
    await Profile.create({ ...student, id: "google-user-1" });

    expect(await Profile.countDocuments({ id: "google-user-1" })).toBe(1);
  });
});
