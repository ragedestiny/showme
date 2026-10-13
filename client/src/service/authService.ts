import { logoutUser } from "../actions/user";
import { clearAllSentences } from "../actions/usersentences";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

const useAuthService = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const signInorOut = async (
    user,
    setLoading,
    handleShowLoginModal,
    handleNavCollapse
  ) => {
    try {
      // sign out user if there is one signed in
      if (Object.keys(user).length !== 0) {
        setLoading(true); // Start loading
        await dispatch(logoutUser());
        dispatch(clearAllSentences());
        setLoading(false); // Stop loading
        // Navigate to homepage once logged out
        navigate("/");
      } else if (Object.keys(user).length === 0) {
        // Show login modal if no user is currently logged in
        handleShowLoginModal();
      }
      handleNavCollapse(); // Collapse the navbar after clicking
    } catch (error) {
      setLoading(false); // Stop loading in case of error
      // Handle any logout errors here
      console.error("Logout failed:", error);
    }
  };

  return signInorOut;
};

export default useAuthService;
