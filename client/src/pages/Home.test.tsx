import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Home from "./Home";

describe("Home page", () => {
  // In JSX, anything written after a tag is text on the page, so a stray
  // character there (like a ";" after the carousel) shows up for visitors
  it("shows the carousel and no stray text around it", () => {
    const { container } = render(<Home />);

    const page = container.querySelector(".contenthome");
    expect(page?.querySelector(".carousel")).not.toBeNull();
    const strayText = [...(page?.childNodes ?? [])]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .filter((text) => text?.trim());
    expect(strayText).toEqual([]);
  });
});
