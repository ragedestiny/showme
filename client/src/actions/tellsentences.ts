import * as api from "../api";

// Retrieve tell sentences
export const getTellSentences = () => async (dispatch) => {
  try {
    const { data } = await api.fetchTellSentences();

    dispatch({ type: "FETCH_TELL", payload: data });
  } catch (error) {
    console.log(error.message);
  }
};
