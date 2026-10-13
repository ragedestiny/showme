import { API } from "./index";

// The 401 rule. Every response from the backend passes through here before the
// rest of the app sees it. A 401 means "I don't know who you are": the login
// expired, was logged out on another device, or was never there. So forget the
// user everywhere with one LOGOUT action.
// The login request itself is skipped: a rejected login just means "try again".
// Returns the interceptor's id so tests can remove it again.
export const setupInterceptors = (store, api = API) =>
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const isLoginRequest = error.config?.url === "/auth";
      if (error.response?.status === 401 && !isLoginRequest) {
        store.dispatch({ type: "LOGOUT" });
      }
      // Pass the error on so the code that made the request can react too.
      return Promise.reject(error);
    }
  );
