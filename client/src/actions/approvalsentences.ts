import * as api from "../api";
import type { ReviewDecision, SentenceWithAuthor } from "../api/types";
import type { AppThunk } from "../reducers/types";

// fetch Sentences Awaiting Approval
export const fetchApprovalSentences = (): AppThunk => async (dispatch) => {
  try {
    const { data } = await api.fetchApprovalSentences();

    dispatch({ type: "FETCH_APPROVAL", payload: data });
  } catch (error) {
    console.error((error as Error).message);
  }
};

export const updatePendingApprovalSentences =
  (status: ReviewDecision, sentence: SentenceWithAuthor): AppThunk =>
  async (dispatch) => {
    try {
      const { data } = await api.updatePendingApprovalSentences(
        status,
        sentence
      );
      dispatch({ type: "UPDATE_APPROVAL_SENTENCES", payload: data });
    } catch (error) {
      console.error(`Error updating sentence status to ${status}:`, error);
    }
  };
