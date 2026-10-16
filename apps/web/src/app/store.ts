import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@shared/api/baseApi";

/** RTK Query cache only. UI state lives in feature model/ hooks. */
export function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
