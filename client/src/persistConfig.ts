import storage from "redux-persist/es/storage";
import type { PersistConfig } from "redux-persist";
import type { RootState } from "./reducers/types";

// What redux-persist saves in the browser between visits: everything except
// `session`, whether the server has confirmed who is logged in. That must
// start over on every visit, or pages would trust a remembered user again.
const persistConfig: PersistConfig<RootState> = {
  key: "root",
  version: 1,
  storage,
  blacklist: ["session"],
};

export default persistConfig;
