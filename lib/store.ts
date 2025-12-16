import { configureStore } from "@reduxjs/toolkit";
import listsReducer from "./features/lists/listsSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      lists: listsReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
