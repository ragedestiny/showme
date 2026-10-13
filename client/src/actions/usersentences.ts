import * as api from "../api";
import type { EditedSentence, NewSentence } from "../api/types";
import type { AppThunk } from "../reducers/types";

// Retrieve user sentences
export const getUserSentences = (): AppThunk => async (dispatch) => {
  try {
    const { data } = await api.fetchUserSentences();

    dispatch({ type: "FETCH_ALL", payload: data });
  } catch (error) {
    console.log((error as Error).message);
  }
};

// update edited sentences
export const editSentences =
  (editedSentence: EditedSentence): AppThunk =>
  async (dispatch) => {
    try {
      const { data } = await api.editUserSentences(editedSentence);
      dispatch({ type: "EDIT", payload: data });
    } catch (error) {
      console.log((error as Error).message);
    }
  };

// Create new sentences
export const createSentence =
  (newSentence: NewSentence): AppThunk =>
  async (dispatch) => {
    try {
      const { data } = await api.createSentence(newSentence);

      dispatch({ type: "CREATE", payload: data });
    } catch (error) {
      console.log((error as Error).message);
    }
  };

export const clearAllSentences = (): AppThunk => async (dispatch) => {
  dispatch({ type: "CLEAR_ALL" });
};
