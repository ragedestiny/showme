import type { TellSentence } from "../api/types";
import type { AppAction } from "./types";

// tell sentence reducer, keep track of tell sentences
const tellsentences = (
  tellsentences: TellSentence[] = [],
  action: AppAction
): TellSentence[] => {
  switch (action.type) {
    case "FETCH_TELL":
      return action.payload;
    default:
      return tellsentences;
  }
};

export default tellsentences;
