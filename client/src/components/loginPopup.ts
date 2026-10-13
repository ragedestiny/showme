import { createContext, useContext } from "react";

// Opens the "Sign in with Google" pop-up from any page. NavbarComp owns the
// pop-up and hands this opener down to the pages it shows; outside it (e.g. a
// page drawn on its own in a test), opening does nothing.
export const OpenLoginContext = createContext(() => {});

export const useOpenLogin = () => useContext(OpenLoginContext);
