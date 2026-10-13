import { describe, expect, it } from "vitest";
import persistConfig from "./persistConfig";

describe("what the browser remembers between visits", () => {
  // If the browser remembered "the server has said who is logged in", the next
  // visit would believe it before asking, and the Admin page could again judge
  // by a remembered user (see pages/Admin.tsx).
  it("never includes whether the login was checked: each visit asks the server again", () => {
    expect(persistConfig.blacklist).toContain("session");
  });
});
