import * as api from "../api";

// action to fetch Approved sentences. Also hands the result back to whoever
// asked, so they can use it right away: the list (empty if nothing has been
// approved yet), or null if the request failed.
export const fetchApprovedSentences = () => async (dispatch) => {
  try {
    const { data } = await api.fetchApprovedSentences();

    dispatch({ type: "FETCH_APPROVED", payload: data });
    return data;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};
