import React, { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useDispatch } from "react-redux";
import { fetchUser } from "../actions/user";
import { useNavigate } from "react-router";
import LoadingSpinner from "../components/LoadingSpinner";
import { loginUser } from "../api";
import type { AppDispatch } from "../reducers/types";

function Login({ show, onHide }: { show: boolean; onHide?: () => void }) {
  // dispatch for react redux
  const dispatch = useDispatch<AppDispatch>();

  // navigate from react router
  const navigate = useNavigate();

  // state to show login modal
  const [loading, setLoading] = useState(false);

  // Set up Google's sign-in button. The function Google calls after a sign-in
  // lives inside this effect, so Google always gets a version that uses the
  // current onHide/navigate (not ones remembered from the first draw).
  useEffect(() => {
    async function handleCallbackResponse(
      response: google.accounts.id.CredentialResponse
    ) {
      setLoading(true);

      try {
        // Send Google's ID token to our backend. If it's valid, the backend's
        // reply sets the httpOnly login cookie; the browser stores it for us.
        await loginUser(response.credential);
        // Fetching the user also proves the cookie works end to end.
        await dispatch(fetchUser());
        onHide?.();
        setLoading(false);
        navigate("/MyPage");
      } catch (error) {
        console.error("Authentication error", error);
        setLoading(false);
      }
    }

    // setup for Google identity service, once the modal has drawn its box
    const timer = setTimeout(() => {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCallbackResponse,
      });
      // The box is there: the modal draws it straight away, and the spinner
      // only replaces it after a sign-in, which needs the button first
      google.accounts.id.renderButton(document.getElementById("signInDiv")!, {
        type: "standard", // Google's default, which its types ask to spell out
        theme: "outline",
        size: "large",
      });
      google.accounts.id.prompt();
    }, 300);

    // If the popup closes first, cancel: there'd be no box to draw into
    return () => clearTimeout(timer);
  }, [dispatch, navigate, onHide]);

  // login modal with React and google identity service
  return (
    <>
      {/* <Home /> */}

      <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Sign in with Google</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="spinner">
              <LoadingSpinner />
            </div>
          ) : (
            <div id="signInDiv"></div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Login;
