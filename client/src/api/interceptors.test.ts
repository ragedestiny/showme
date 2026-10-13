import { describe, expect, it, vi } from "vitest";
import axios from "axios";
import { setupInterceptors } from "./interceptors";
import { fakeNetwork } from "../test/testUtils";
import type { Outcome, Respond } from "../test/testUtils";

// A fresh axios copy per test, wired to the pretend network, plus a fake
// store that just records which actions were sent.
const setup = (respond: Respond) => {
  const api = axios.create({ baseURL: "/api", adapter: fakeNetwork(respond) });
  const store = { dispatch: vi.fn() };
  setupInterceptors(store, api);
  return { api, store };
};

describe("the 401 rule", () => {
  it("logs out when any request comes back 401", async () => {
    const { api, store } = setup(() => 401);

    await expect(api.get("/MyPage")).rejects.toThrow();

    expect(store.dispatch).toHaveBeenCalledWith({ type: "LOGOUT" });
  });

  it("still passes the error on, so the page can stop its spinner", async () => {
    const { api } = setup(() => 401);

    await expect(api.get("/MyPage")).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it("doesn't log out when the login request itself is rejected", async () => {
    const { api, store } = setup(() => 401);

    await expect(api.post("/auth", { token: "bad" })).rejects.toThrow();

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it.each<[string, Outcome]>([
    ["a server error (500)", 500],
    ["forbidden (403)", 403],
    ["no answer at all (offline)", "offline"],
  ])("doesn't log out on %s", async (_, outcome) => {
    const { api, store } = setup(() => outcome);

    await expect(api.get("/MyPage")).rejects.toThrow();

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("lets successful responses through untouched", async () => {
    const { api, store } = setup(() => ({ status: 200, data: { ok: true } }));

    const res = await api.get("/MyPage");

    expect(res.data).toEqual({ ok: true });
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
