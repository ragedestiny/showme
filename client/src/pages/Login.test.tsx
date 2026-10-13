import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import Login from "./Login";
import { renderWithApp } from "../test/testUtils";

// A pretend Google sign-in script: records what the page asks it to do.
let google;
beforeEach(() => {
  google = {
    accounts: {
      id: {
        initialize: vi.fn(),
        renderButton: vi.fn(),
        prompt: vi.fn(),
      },
    },
  };
  vi.stubGlobal("google", google);
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Shows the current address, so tests can see where Login navigated to
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderLogin = ({ onHide = vi.fn(), respond } = {}) => {
  const requests = [];
  const view = renderWithApp(
    <Routes>
      <Route path="*" element={<><Login show onHide={onHide} /><Where /></>} />
    </Routes>,
    {
      respond: (config) => {
        requests.push(config);
        if (respond) return respond(config);
        if (config.url === "/auth") return { status: 200, data: { user: {} } };
        if (config.url === "/Login") return { status: 200, data: { firstName: "Ada" } };
        return 200;
      },
    }
  );
  return { ...view, requests, onHide };
};

describe("Login", () => {
  it("sets up Google's sign-in button with our client id", async () => {
    renderLogin();

    await waitFor(() => expect(google.accounts.id.initialize).toHaveBeenCalled());
    expect(google.accounts.id.initialize.mock.calls[0][0].client_id).toBe("test-client-id");
    expect(google.accounts.id.renderButton).toHaveBeenCalledWith(
      document.getElementById("signInDiv"),
      expect.anything()
    );
  });

  it("after Google signs someone in: logs in with our backend, closes, and goes to MyPage", async () => {
    const { requests, onHide } = renderLogin();
    await waitFor(() => expect(google.accounts.id.initialize).toHaveBeenCalled());
    const { callback } = google.accounts.id.initialize.mock.calls[0][0];

    await act(() => callback({ credential: "google-id-token" }));

    const auth = requests.find((r) => r.url === "/auth");
    expect(JSON.parse(auth.data)).toEqual({ token: "google-id-token" });
    expect(requests.some((r) => r.url === "/Login")).toBe(true);
    expect(onHide).toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/MyPage");
  });

  it("stays put if our backend rejects the sign-in", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { onHide } = renderLogin({ respond: (c) => (c.url === "/auth" ? 401 : 200) });
    await waitFor(() => expect(google.accounts.id.initialize).toHaveBeenCalled());
    const { callback } = google.accounts.id.initialize.mock.calls[0][0];

    await act(() => callback({ credential: "bad" }));

    expect(onHide).not.toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/");
  });

  it("doesn't set up Google's button if the popup closes within 300ms", () => {
    vi.useFakeTimers();
    const { unmount } = renderLogin();

    unmount();
    act(() => vi.advanceTimersByTime(1000));

    expect(google.accounts.id.initialize).not.toHaveBeenCalled();
  });
});
