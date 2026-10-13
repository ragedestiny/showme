import React from "react";
import ReactDOM from "react-dom/client";
import App from "../src/components/App";
import "mdb-react-ui-kit/dist/css/mdb.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "./reducers";
import { setupInterceptors } from "./api/interceptors";
import { PersistGate } from "redux-persist/integration/react";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import persistConfig from "./persistConfig";
import type { AppAction, RootState } from "./reducers/types";

// Setup redux-persist. (Its types were written before Redux 5 and can't work
// out the state from `reducers` on their own, so it's spelled out.)
const persistedReducer = persistReducer<RootState, AppAction>(
  persistConfig,
  reducers
);

// react redux global persisted state in store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Log out everywhere whenever the backend answers 401
setupInterceptors(store);

// Pages are downloaded on demand (see NavbarComp). After a new deploy, a tab
// that was opened earlier may ask for an old page file that no longer exists.
// Reload to pick up the new version, but at most once every 10 seconds, so a
// file that is missing for some other reason (e.g. the network is down)
// can't cause a reload loop; then the page shows its "couldn't load" message.
window.addEventListener("vite:preloadError", (event) => {
  // Offline, a reload can't help (and would replace the app with the
  // browser's offline page); let the page show its "couldn't load" message
  if (!navigator.onLine) return;
  try {
    const last = Number(sessionStorage.getItem("reloadedForNewVersionAt"));
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem("reloadedForNewVersionAt", String(Date.now()));
  } catch {
    return; // storage blocked: show the message rather than risk a loop
  }
  event.preventDefault();
  window.location.reload();
});

// index.html always has the #root element
const root = ReactDOM.createRoot(document.getElementById("root")!);
const persistor = persistStore(store);

root.render(
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>
);
