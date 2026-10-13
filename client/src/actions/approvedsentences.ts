import * as api from "../api";
import type { SentenceWithAuthor } from "../api/types";
import type { AppThunk } from "../reducers/types";

// action to fetch Approved sentences. Also hands the result back to whoever
// asked, so they can use it right away: the list (empty if nothing has been
// approved yet), or null if the request failed.
export const fetchApprovedSentences =
  (): AppThunk<Promise<SentenceWithAuthor[] | null>> => async (dispatch) => {
    try {
      const { data } = await api.fetchApprovedSentences();

      dispatch({ type: "FETCH_APPROVED", payload: data });
      return data;
    } catch (error) {
      console.log((error as Error).message);
      return null;
    }
  };
