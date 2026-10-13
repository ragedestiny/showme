import type { AppAction } from "./types";

// Whether the app has asked the server who is logged in since the page opened.
// Until it has, `user` is only who this browser remembered from last time,
// which may be someone else (for example a student who used it earlier).
// Never saved in the browser (see persistConfig.ts): every visit asks again.
const session = (
  state: { checked: boolean } = { checked: false },
  action: AppAction
): { checked: boolean } => {
  switch (action.type) {
    case "SESSION_CHECKED":
      return { checked: true };
    default:
      return state;
  }
};

export default session;
