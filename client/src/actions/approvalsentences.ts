import * as api from "../api";

// fetch Sentences Awaiting Approval
export const fetchApprovalSentences = () => async (dispatch) => {
  try {
    const { data } = await api.fetchApprovalSentences();

    dispatch({ type: "FETCH_APPROVAL", payload: data });
  } catch (error) {
    console.error(error.message);
  }
};

export const updatePendingApprovalSentences =
  (status, sentence) => async (dispatch) => {
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
