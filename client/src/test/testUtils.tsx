import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "../reducers";
import { API } from "../api";

// Draw a component the way the real app does (with the Redux store and the
// router around it), starting from `state`, with the pretend network answering
// every API call through `respond`. Returns the store so tests can inspect it.
export const renderWithApp = (
  ui,
  { state = {}, respond = () => 200, route = "/" } = {}
) => {
  const store = configureStore({ reducer: reducers, preloadedState: state });
  API.defaults.adapter = fakeNetwork(respond);
  // A wrapper (rather than wrapping `ui` directly) stays in place when a test
  // calls rerender() with new props.
  const Wrapper = ({ children }) => (
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
export const fakeNetwork = (respond) => async (config) => {
  const outcome = await respond(config);

  if (outcome === "offline") {
    const error = new Error("Network Error");
    error.config = config; // no `response`: the server never answered
    throw error;
  }

  const { status, data = {} } =
    typeof outcome === "number" ? { status: outcome } : outcome;
  const response = { status, data, headers: {}, config, statusText: "" };

  if (status >= 400) {
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = response;
    throw error;
  }
  return response;
};
