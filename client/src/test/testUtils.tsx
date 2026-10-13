import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "../reducers";
import { API } from "../api";
import type { RootState } from "../reducers/types";

// What the pretend server answers a request with: a status, a status with
// data, or "offline" (no answer at all)
export type Outcome = number | "offline" | { status: number; data?: unknown };

// Answers each request; a promise holds the answer back until it resolves
export type Respond = (
  config: InternalAxiosRequestConfig
) => Outcome | Promise<Outcome>;

// Draw a component the way the real app does (with the Redux store and the
// router around it), starting from `state`, with the pretend network answering
// every API call through `respond`. Returns the store so tests can inspect it.
export const renderWithApp = (
  ui: ReactElement,
  {
    state = {},
    respond = () => 200,
    route = "/",
  }: { state?: Partial<RootState>; respond?: Respond; route?: string } = {}
) => {
  const store = configureStore({ reducer: reducers, preloadedState: state });
  API.defaults.adapter = fakeNetwork(respond);
  // A wrapper (rather than wrapping `ui` directly) stays in place when a test
  // calls rerender() with new props.
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );
  const view = render(ui, { wrapper: Wrapper });
  return { store, ...view };
};

// A pretend network for tests. Axios sends every request through an "adapter";
// this one never touches the internet. It answers each request with whatever
// `respond(config)` returns: a status number, or "offline".
// `respond` may also return a promise, to hold an answer back until the test
// releases it.
export const fakeNetwork =
  (respond: Respond) =>
  async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const outcome = await respond(config);

    if (outcome === "offline") {
      // no `response`: the server never answered
      throw Object.assign(new Error("Network Error"), { config });
    }

    const { status, data = {} } =
      typeof outcome === "number" ? { status: outcome } : outcome;
    const response = { status, data, headers: {}, config, statusText: "" };

    if (status >= 400) {
      throw Object.assign(
        new Error(`Request failed with status code ${status}`),
        { config, response }
      );
    }
    return response;
  };
