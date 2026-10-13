import { combineReducers } from "@reduxjs/toolkit";
import tellsentences from "./tellsentences";
import usersentences from "./usersentences";
import user from "./user";
import approvalsentences from "./approvalsentences";
import approvedsentences from "./approvedsentences";
import session from "./session";

// combine reducers for react redux
export default combineReducers({
  tellsentences,
  user,
  session,
  usersentences,
  approvalsentences,
  approvedsentences,
});
