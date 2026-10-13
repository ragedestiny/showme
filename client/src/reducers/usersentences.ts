import type { Sentence } from "../api/types";
import type { AppAction } from "./types";

// user sentences reducer, keeps track of user sentences
const usersentences = (
  usersentences: Sentence[] = [],
  action: AppAction
): Sentence[] => {
  switch (action.type) {
    case "FETCH_ALL":
      return [...action.payload];
    case "CREATE":
      // Already listed if the list arrived from the server after the save:
      // adding it again would show it twice (and skip a day number)
      if (usersentences.some((sentence) => sentence._id === action.payload._id)) {
        return usersentences;
      }
      return [...usersentences, action.payload];
    case "EDIT":
      return usersentences.map((sentence) => {
        if (sentence.title === action.payload.title) {
          return action.payload;
        }
        return sentence;
      });
    case "CLEAR_ALL":
    case "LOGOUT":
      return [];
    default:
      return usersentences;
  }
};

export default usersentences;
