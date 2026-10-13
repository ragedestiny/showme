import type { User } from "../api/types";
import type { AppAction } from "./types";

// The signed-in user, or {} when nobody is. Hence Partial: when nobody is
// signed in, every field is missing.
export type UserState = Partial<User>;

// user reducer, keep track of user
const user = (state: UserState = {}, action: AppAction): UserState => {
  switch (action.type) {
    case "FIND_USER":
      return action.payload;
    case "LOGOUT":
      return {};
    default:
      return state;
  }
};

export default user;
