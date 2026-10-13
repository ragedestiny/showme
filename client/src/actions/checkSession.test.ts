import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "../reducers";
import { API } from "../api";
import { setupInterceptors } from "../api/interceptors";
import { checkSession } from "./user";
import { fakeNetwork } from "../test/testUtils";
import type { Outcome, Respond } from "../test/testUtils";
import type { UserState } from "../reducers/user";

// Real store, real reducers, real API instance, real interceptor; only the
// network is pretend. `remembered` is what redux-persist restored on startup.
let interceptorId: number;
const startApp = ({
  remembered,
  respond,
}: {
  remembered: UserState;
  respond: Respond;
}) => {
  const store = configureStore({
    reducer: reducers,
    preloadedState: { user: remembered },
  });
  API.defaults.adapter = vi.fn(fakeNetwork(respond));
  interceptorId = setupInterceptors(store);
  return store;
};

afterEach(() => {
  API.interceptors.response.eject(interceptorId);
});

describe("checking the login when the app opens", () => {
  const ada = { firstName: "Ada", email: "ada@example.com" };

  // The httpOnly login cookie is the source of truth, not what the browser
  // remembers: a valid cookie with nothing remembered (storage cleared, or a
  // test robot's login) still means "logged in".
  it("shows the user from a valid login cookie even when nobody is remembered", async () => {
    const store = startApp({
      remembered: {},
      respond: (config) => {
        expect(config.url).toBe("/Login");
        return { status: 200, data: ada };
      },
    });

    await store.dispatch(checkSession());

    expect(store.getState().user).toEqual(ada);
  });

  it("stays logged out, quietly, when nobody is remembered and there is no login (401)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = startApp({ remembered: {}, respond: () => 401 });

    await store.dispatch(checkSession());

    expect(store.getState().user).toEqual({});
    expect(consoleError).not.toHaveBeenCalled(); // a visitor is not an error
    consoleError.mockRestore();
  });

  it("keeps the user, with fresh details, when the login is still valid", async () => {
    const store = startApp({
      remembered: ada,
      respond: (config) => {
        expect(config.url).toBe("/Login");
        return { status: 200, data: { ...ada, firstName: "Ada (fresh)" } };
      },
    });

    await store.dispatch(checkSession());

    expect(store.getState().user.firstName).toBe("Ada (fresh)");
  });

  it("forgets the user when the server says the login is gone (401)", async () => {
    const store = startApp({ remembered: ada, respond: () => 401 });

    await store.dispatch(checkSession());

    expect(store.getState().user).toEqual({});
  });

  it("keeps the user when the server can't be reached", async () => {
    const store = startApp({ remembered: ada, respond: () => "offline" });

    await store.dispatch(checkSession());

    expect(store.getState().user).toEqual(ada);
  });

  // Pages that depend on who is logged in (Admin) wait for this, instead of
  // judging by what the browser remembered
  it.each<[string, Outcome]>([
    ["a logged-in user", { status: 200, data: ada }],
    ["nobody logged in (401)", 401],
    ["no answer (offline)", "offline"],
  ])("marks the login as checked once the server has answered: %s", async (_, answer) => {
    const store = startApp({ remembered: {}, respond: () => answer });
    expect(store.getState().session.checked).toBe(false);

    await store.dispatch(checkSession());

    expect(store.getState().session.checked).toBe(true);
  });
});
