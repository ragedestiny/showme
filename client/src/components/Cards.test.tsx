import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import Cards from "./Cards";
import { renderWithApp } from "../test/testUtils";
import type { SentenceWithAuthor } from "../api/types";

// Characterization tests for the Collections cards, written before reworking
// how they track which pictures are still loading.

const tellsentences = [
  { key: 1, title: "Day 1", tell: "It is cold outside.", image: "/cold.jpg" },
  { key: 2, title: "Day 2", tell: "It is hot outside.", image: "/hot.jpg" },
];

const approved = (n: number, prefix = "Show"): SentenceWithAuthor[] =>
  Array.from({ length: n }, (_, i) => ({
    _id: `${prefix}-${i}`,
    title: `day${(i % 2) + 1}`,
    tell: tellsentences[i % 2].tell,
    show: `${prefix} ${i + 1}`,
    approved: true,
    toRedo: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    author: { firstName: "Ada", lastName: "Lovelace" },
  }));

const renderCards = (sentences: SentenceWithAuthor[]) =>
  renderWithApp(<Cards displaySentences={sentences} />, {
    state: { tellsentences, approvedsentences: sentences },
  });

const pictures = () => screen.queryAllByRole("img");
const placeholders = () => document.querySelectorAll(".MuiSkeleton-root");

afterEach(() => {
  vi.useRealTimers();
});

describe("Cards", () => {
  it("shows each sentence with its tell sentence and the author's first name and initial", () => {
    renderCards(approved(2));

    expect(screen.getByText("Show 1")).toBeInTheDocument();
    expect(screen.getByText("It is cold outside.")).toBeInTheDocument();
    expect(screen.getByText("Show 2")).toBeInTheDocument();
    expect(screen.getAllByText("Ada L.")).toHaveLength(2);
  });

  it("shows at most 12 cards", () => {
    renderCards(approved(15));

    expect(screen.getAllByText(/^Show \d+$/)).toHaveLength(12);
  });

  it("uses the picture of the matching day", () => {
    renderCards(approved(2));

    const [first, second] = document.querySelectorAll("img");
    expect(first).toHaveAttribute("src", "/cold.jpg");
    expect(second).toHaveAttribute("src", "/hot.jpg");
  });

  it("shows a grey placeholder until a picture loads, then the picture", () => {
    renderCards(approved(2));
    expect(placeholders()).toHaveLength(2);
    expect(pictures()).toHaveLength(0); // hidden pictures aren't visible to users

    fireEvent.load(document.querySelectorAll("img")[0]);

    expect(placeholders()).toHaveLength(1);
    expect(pictures()).toHaveLength(1);
  });

  it("shows all pictures after 4 seconds, even if they never finish loading", () => {
    vi.useFakeTimers();
    renderCards(approved(2));

    act(() => vi.advanceTimersByTime(4000));

    expect(placeholders()).toHaveLength(0);
    expect(pictures()).toHaveLength(2);
  });

  it("goes back to placeholders when the list of sentences changes", () => {
    const { rerender } = renderCards(approved(2));
    document.querySelectorAll("img").forEach((img) => fireEvent.load(img));
    expect(placeholders()).toHaveLength(0);

    rerender(<Cards displaySentences={approved(2, "Newer")} />);

    expect(screen.getByText("Newer 1")).toBeInTheDocument();
    expect(placeholders()).toHaveLength(2);
  });

  // The database doesn't require a last name: older accounts, and Google
  // accounts without one, have none (or an empty one). One such card used to
  // stop the whole Collections page from drawing.
  it("shows just the first name when the author has no last name", () => {
    const [ada, bo, cy] = approved(3);
    renderCards([
      ada,
      { ...bo, author: { firstName: "Bo" } },
      { ...cy, author: { firstName: "Cy", lastName: "" } },
    ]);

    expect(screen.getByText("Ada L.")).toBeInTheDocument();
    expect(screen.getByText("Bo")).toBeInTheDocument();
    expect(screen.getByText("Cy")).toBeInTheDocument();
  });
});
