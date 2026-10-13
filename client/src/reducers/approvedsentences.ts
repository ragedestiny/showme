import type { SentenceWithAuthor } from "../api/types";
import type { AppAction } from "./types";

//  Approved sentences reducer, keep track of approved sentences
const approvedsentences = (
  approvedsentences: SentenceWithAuthor[] = [],
  action: AppAction
): SentenceWithAuthor[] => {
  switch (action.type) {
    case "FETCH_APPROVED":
      return action.payload;
    default:
      return approvedsentences;
  }
};

export default approvedsentences;
