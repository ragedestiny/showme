import React, { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import NavbarComp from "./NavbarComp";
import Footer from "./Footer";
import { useDispatch } from "react-redux";
import { getTellSentences } from "../actions/tellsentences";
import { BrowserRouter } from "react-router";
import { checkSession } from "../actions/user";

function App() {
  const dispatch = useDispatch();

  // The first screen is drawn: take away the "Loading..." overlay that
  // index.html shows while the app's code downloads
  useEffect(() => {
    document.getElementById("app-loading")?.remove();
  }, []);

  //as soon as App loads, fetch Tell sentences and approved sentences from server
  useEffect(() => {
    // check that a remembered login is still valid on the server
    dispatch(checkSession());
    dispatch(getTellSentences());
  }, [dispatch]);

  return (
    <>
      <BrowserRouter>
        <NavbarComp />
        <Footer />
      </BrowserRouter>
    </>
  );
}

export default App;
