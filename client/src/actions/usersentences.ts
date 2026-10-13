import * as api from "../api";

// Retrieve user sentences
export const getUserSentences = () => async (dispatch) => {
  try {
    const { data } = await api.fetchUserSentences();

    dispatch({ type: "FETCH_ALL", payload: data });
  } catch (error) {
    console.log(error.message);
  }
};

// update edited sentences
export const editSentences = (editedSentence) => async (dispatch) => {
  try {
    const { data } = await api.editUserSentences(editedSentence);
    dispatch({ type: "EDIT", payload: data });
  } catch (error) {
    console.log(error.message);
  }
};

// Create new sentences
export const createSentence = (newSentence) => async (dispatch) => {
  try {
    const { data } = await api.createSentence(newSentence);

    dispatch({ type: "CREATE", payload: data });
  } catch (error) {
    console.log(error.message);
  }
};

export const clearAllSentences = () => async (dispatch) => {
  dispatch({ type: "CLEAR_ALL" });
};
