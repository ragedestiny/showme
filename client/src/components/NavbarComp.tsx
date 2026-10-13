import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router";
import Home from "../pages/Home";
import PageErrorBoundary from "./PageErrorBoundary";
import PageLoading from "./PageLoading";
import { useSelector } from "react-redux";
import LoadingOverlay from "react-loading-overlay-ts";
import useAuthService from "../service/authService";
import { OpenLoginContext } from "./loginPopup";

// Home is the first page most visitors see, so it ships with the main file.
// Every other page has its own file, so the home page doesn't wait for code
// (like MUI for Collections) it doesn't use.
const loadAbout = () => import("../pages/About");
const loadLogin = () => import("../pages/Login");
const loadMyPage = () => import("../pages/MyPage");
const loadAdmin = () => import("../pages/Admin");
const loadCollection = () => import("../pages/Collection");

const About = lazy(loadAbout);
const Login = lazy(loadLogin);
const MyPage = lazy(loadMyPage);
const Admin = lazy(loadAdmin);
const Collection = lazy(loadCollection);

// Once the first page is showing and the browser has nothing else to do,
// download the other pages' files in the background, so opening them later
// is instant instead of waiting for the download at the moment of the click.
const prefetchPages = () => {
  [loadAbout, loadLogin, loadMyPage, loadAdmin, loadCollection].forEach(
    (load) => load().catch(() => {}) // a failure here is retried on the click
  );
};
// Returns a function that cancels the wait, for when the navbar goes away first
const whenIdle = (callback) => {
  if (window.requestIdleCallback) {
    const id = window.requestIdleCallback(callback, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 1000); // Safari has no requestIdleCallback
  return () => clearTimeout(id);
};

// Going to /login directly (an old bookmark, or typing the address): open the
// sign-in pop-up over the home page, just like the Login link does. Login is
// a pop-up, so showing it on a page of its own left that page empty.
function OpenLogin({ onOpen }) {
  const navigate = useNavigate();
  useEffect(() => {
    onOpen();
    navigate("/", { replace: true });
  }, [onOpen, navigate]);
  return null;
}

function NavbarComp() {
  // get user from global react redux store
  const user = useSelector((state) => state.user);
  const location = useLocation();

  const authService = useAuthService();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // In the app the navbar never goes away, but in tests each one is removed
  // after its test; a download still waiting then would land in a later test
  useEffect(() => whenIdle(prefetchPages), []);

  // Function to handle showing the login modal (the same function between
  // draws, so OpenLogin's effect runs once)
  const handleShowLoginModal = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  // Function to handle hiding the login modal. useCallback keeps it the same
  // function between draws, so Login doesn't set up Google's button again
  // every time this navbar redraws.
  const handleHideLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  // Function to handle collapsing the Navbar
  const handleNavCollapse = () => setExpanded(false);

  // Use authService hook to sign in or out
  const signInorOut = async () => {
    await authService(
      user,
      setLoading,
      handleShowLoginModal,
      handleNavCollapse
    );
  };

  // React bootstrap Navbar and different routes for different parts of the website
  return (
    <>
      <LoadingOverlay active={loading} spinner text="Logging out...">
        <div>
          <Navbar
            variant="light"
            style={{ backgroundColor: "#e3f2fd" }}
            expand="sm"
            expanded={expanded}
          >
            <Container>
              <Navbar.Brand as={Link} to={"/"}>
                <img
                  src={"showme.jpg"}
                  alt="Show ME"
                  height="35"
                  loading="lazy"
                  className="d-inline-block align-top"
                />
              </Navbar.Brand>
              <Navbar.Toggle
                aria-controls="basic-navbar-nav"
                onClick={() => setExpanded(expanded ? false : "expanded")}
              />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="ms-auto">
                  <Nav.Link
                    as={Link}
                    to={"/admin"}
                    hidden={!user.isAdmin}
                    onClick={handleNavCollapse}
                  >
                    Admin
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={"/Collections"}
                    onClick={handleNavCollapse}
                  >
                    Collections
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to={"/MyPage"}
                    hidden={Object.keys(user).length === 0 ? true : false}
                    onClick={handleNavCollapse}
                  >
                    {user ? `${user.firstName}'s Page` : ""}
                  </Nav.Link>
                  <Nav.Link onClick={signInorOut}>
                    {Object.keys(user).length !== 0 ? "Logout" : "Login"}
                  </Nav.Link>
                  <Nav.Link as={Link} to={"/about"} onClick={handleNavCollapse}>
                    About
                  </Nav.Link>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>
        </div>
        <div>
          <PageErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoading />}>
              {/* Lets pages open the sign-in pop-up (see loginPopup.ts) */}
              <OpenLoginContext.Provider value={handleShowLoginModal}>
                <Routes>
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/collections" element={<Collection />} />
                  <Route path="/about" element={<About />} />
                  <Route
                    path="/login"
                    element={<OpenLogin onOpen={handleShowLoginModal} />}
                  />
                  <Route path="/MyPage" element={<MyPage />} />
                  <Route path="/" element={<Home />} />
                </Routes>
              </OpenLoginContext.Provider>
            </Suspense>
          </PageErrorBoundary>
        </div>
        {/* Conditionally render the LoginModal */}
        {showLoginModal && (
          <PageErrorBoundary>
            <Suspense fallback={null}>
              <Login show={showLoginModal} onHide={handleHideLoginModal} />
            </Suspense>
          </PageErrorBoundary>
        )}
      </LoadingOverlay>
    </>
  );
}

export default React.memo(NavbarComp);
