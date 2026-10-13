import type { ThunkAction, ThunkDispatch } from "@reduxjs/toolkit";
import type { Sentence, SentenceWithAuthor, TellSentence, User } from "../api/types";
import type { RootState } from "./index";

export type { RootState };

// Every action the store understands, and what each one carries. Dispatching
// an action that isn't listed here, or with the wrong payload, is an error.
export type AppAction =
  | { type: "FETCH_TELL"; payload: TellSentence[] }
  | { type: "FIND_USER"; payload: User }
  | { type: "SESSION_CHECKED" }
  | { type: "LOGOUT" }
  | { type: "FETCH_ALL"; payload: Sentence[] }
  | { type: "CREATE"; payload: Sentence }
  | { type: "EDIT"; payload: Sentence }
  | { type: "CLEAR_ALL" }
  | { type: "FETCH_APPROVAL"; payload: SentenceWithAuthor[] }
  | { type: "UPDATE_APPROVAL_SENTENCES"; payload: SentenceWithAuthor[] }
  | { type: "FETCH_APPROVED"; payload: SentenceWithAuthor[] };

// The store's dispatch, which also runs the async actions in src/actions/
export type AppDispatch = ThunkDispatch<RootState, unknown, AppAction>;

// An async action (a "thunk"): a function the store runs with its dispatch.
// `Result` is what dispatching it returns, usually a promise to wait on.
export type AppThunk<Result = Promise<void>> = ThunkAction<
  Result,
  RootState,
  unknown,
  AppAction
>;
