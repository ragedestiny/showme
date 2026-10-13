import * as api from "../api";
import type { AppThunk } from "../reducers/types";

// Retrieve tell sentences
export const getTellSentences = (): AppThunk => async (dispatch) => {
  try {
    const { data } = await api.fetchTellSentences();

    dispatch({ type: "FETCH_TELL", payload: data });
  } catch (error) {
    console.log((error as Error).message);
  }
};
