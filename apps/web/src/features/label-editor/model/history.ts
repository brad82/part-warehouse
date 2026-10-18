/** An undo stack: everything before `present`, and what redo brings back. */
export type History<T> = { past: T[]; present: T; future: T[] };

const LIMIT = 100;

export const historyOf = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
});

/** A new undoable step; clears redo. */
export const commit = <T>(h: History<T>, next: T): History<T> => ({
  past: [...h.past, h.present].slice(-LIMIT),
  present: next,
  future: [],
});

/** Changes within the current step (e.g. typing), not undoable on its own. */
export const replacePresent = <T>(h: History<T>, next: T): History<T> => ({
  ...h,
  present: next,
});

export const undo = <T>(h: History<T>): History<T> =>
  h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      }
    : h;

export const redo = <T>(h: History<T>): History<T> =>
  h.future.length
    ? {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
