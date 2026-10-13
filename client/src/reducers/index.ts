import { combineReducers } from "@reduxjs/toolkit";
import type { Reducer, StateFromReducersMapObject } from "@reduxjs/toolkit";
import tellsentences from "./tellsentences";
import usersentences from "./usersentences";
import user from "./user";
import approvalsentences from "./approvalsentences";
import approvedsentences from "./approvedsentences";
import session from "./session";
import type { AppAction } from "./types";

const reducers = {
  tellsentences,
  user,
  session,
  usersentences,
  approvalsentences,
  approvedsentences,
};

// The whole app state: one part per reducer
export type RootState = StateFromReducersMapObject<typeof reducers>;

// combine reducers for react redux. Each reducer handles the actions listed in
// AppAction (reducers/types.ts) and passes over any other (Redux and
// redux-persist send their own, e.g. on startup). Redux 5's types expect a
// reducer to take any action, and then can't work out that a starting state
// may leave parts out (tests and redux-persist do), so that is spelled out.
export default combineReducers(reducers) as Reducer<
  RootState,
  AppAction,
  Partial<RootState>
>;
