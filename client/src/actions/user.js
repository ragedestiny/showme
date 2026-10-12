import * as api from "../api";

// Retrieve user info
export const fetchUser = () => async (dispatch) => {
  try {
    const { data } = await api.fetchUser();
    dispatch({ type: "FIND_USER", payload: data });
  } catch (error) {
    // 401 just means "nobody is logged in", which is normal for visitors
    if (error.response?.status !== 401) console.error(error.message);
  }
};

// When the app opens, ask the server who is logged in. The httpOnly login
// cookie is the proof; what redux-persist restored from the browser's storage
// is only a memory of a login. So:
//   - valid cookie: show that user (even if nothing was remembered, e.g. the
//     storage was cleared, or a test robot logged in through the test door)
//   - no or expired cookie (401): the interceptor logs out
//   - no answer (offline): leave things as they are
// Whatever the answer, mark the check done: pages that depend on who is logged
// in (Admin) wait for it instead of judging by what was remembered.
export const checkSession = () => async (dispatch) => {
  try {
    await dispatch(fetchUser());
  } finally {
    dispatch({ type: "SESSION_CHECKED" });
  }
};

// Logout User. The backend cancels the login and deletes the httpOnly cookie
// (JavaScript can't). Whatever happens, forget the user on screen too.
export const logoutUser = () => async (dispatch) => {
  try {
    await api.logoutUser();
  } catch (error) {
    console.error(error.message);
  } finally {
    dispatch({ type: "LOGOUT" });
  }
};
