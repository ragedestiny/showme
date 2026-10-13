import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "../reducers";
import { API } from "../api";
import { fakeNetwork } from "../test/testUtils";
import App from "./App";

// index.html shows a "Loading..." overlay (#app-loading) while the app's code
// downloads. The app takes it away once it has drawn its first screen.

describe("App", () => {
  afterEach(() => document.getElementById("app-loading")?.remove());

  it("removes the startup Loading... overlay once it has drawn its first screen", () => {
    const overlay = document.createElement("div");
    overlay.id = "app-loading";
    document.body.appendChild(overlay);

    API.defaults.adapter = fakeNetwork(() => 401);
    render(
      <Provider store={configureStore({ reducer: reducers })}>
        <App />
      </Provider>
    );

    expect(document.getElementById("app-loading")).toBeNull();
  });
});
