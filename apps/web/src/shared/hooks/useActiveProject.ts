import { createContext, useContext } from "react";

/**
 * Slug of the project the API is serving. The app shell provides it; it's
 * for keying per-project browser storage (ids differ between projects).
 */
export const ActiveProjectContext = createContext("default");

export const useActiveProject = () => useContext(ActiveProjectContext);
