import { afterEach, describe, expect, it, vi } from "vitest";
import { API, fetchApprovedSentences } from "./index";
import { fakeNetwork } from "../test/testUtils";
import type { Respond } from "../test/testUtils";

// On a fresh load of the collection page, index.html asks for the sentences
// before the app's code has even downloaded (see vite.config.ts), and leaves
// the request in window.earlyRequests for the app to pick up.

const sentences = [{ _id: "1", tell: "It is cold outside." }];

// What fetch() hands back, reduced to the parts the app reads
const answer = (status: number, data: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }) as Partial<Response> as Response;

// The pretend network for the app's own requests; records each one
const network = (respond: Respond) => {
  const adapter = vi.fn(fakeNetwork(respond));
  API.defaults.adapter = adapter;
  return adapter;
};

afterEach(() => {
  delete window.earlyRequests;
});

describe("fetchApprovedSentences", () => {
  it("uses the answer index.html already asked for", async () => {
    window.earlyRequests = { "/Collections": Promise.resolve(answer(200, sentences)) };
    const adapter = network(() => ({ status: 200, data: [] }));

    const { data } = await fetchApprovedSentences();

    expect(data).toEqual(sentences);
    expect(adapter).not.toHaveBeenCalled();
  });

  it("uses it only once: coming back to the page asks the server again", async () => {
    window.earlyRequests = { "/Collections": Promise.resolve(answer(200, sentences)) };
    const newer = [...sentences, { _id: "2", tell: "It is hot outside." }];
    const adapter = network(() => ({ status: 200, data: newer }));

    await fetchApprovedSentences();
    const { data } = await fetchApprovedSentences();

    expect(data).toEqual(newer);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the server answered with an error", () => Promise.resolve(answer(500, { message: "down" }))],
    ["there was no answer at all (offline)", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("asks again the usual way when %s", async (_, early) => {
    window.earlyRequests = { "/Collections": early() };
    const adapter = network(() => ({ status: 200, data: sentences }));

    const { data } = await fetchApprovedSentences();

    expect(data).toEqual(sentences);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("still reports a failure the usual way if asking again fails too", async () => {
    window.earlyRequests = { "/Collections": Promise.resolve(answer(500, {})) };
    network(() => 500);

    await expect(fetchApprovedSentences()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("asks the server when index.html didn't (arriving from another page)", async () => {
    const adapter = network(() => ({ status: 200, data: sentences }));

    const { data } = await fetchApprovedSentences();

    expect(data).toEqual(sentences);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
