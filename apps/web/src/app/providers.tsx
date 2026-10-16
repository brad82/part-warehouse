import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store as defaultStore, type AppStore } from "./store";

type Props = {
  children: ReactNode;
  store?: AppStore;
};

export function AppProviders({ children, store = defaultStore }: Props) {
  return <Provider store={store}>{children}</Provider>;
}
