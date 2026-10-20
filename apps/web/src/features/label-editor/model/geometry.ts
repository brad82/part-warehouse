import { SYMBOLOGIES, type LabelElement } from "@parts-warehouse/shared";

/** Compass point of a resize handle on an element's box. */
export type Handle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

/** A pointer drag on the canvas, in mm. `shift` = constrain. */
export type Gesture = {
  mode: "move" | Handle;
  dx: number;
  dy: number;
  shift: boolean;
};

/** Element changes a gesture makes, as block attributes. */
export type Geometry = Partial<Record<"x" | "y" | "width" | "height", number>>;

const ALL: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const CORNERS: Handle[] = ["nw", "ne", "se", "sw"];

/** Square 2D codes (QR, Aztec…) keep a square box; stretching only pads them. */
function keepsSquare(el: LabelElement) {
  return (
    el.type === "barcode" &&
    SYMBOLOGIES[el.symbology].kind === "2d" &&
    el.symbology !== "pdf417" &&
    !(el.symbology === "datamatrix" && el.rectangular)
  );
}

/**
 * Handles an element offers: text only changes width (its height comes from
 * font size × max lines), square codes resize from corners, the rest freely.
 */
export function resizeHandles(el: LabelElement): Handle[] {
  if (el.type === "text") return ["w", "e"];
  return keepsSquare(el) ? CORNERS : ALL;
}

/** Smallest width, height or size a resize leaves, in mm. */
const MIN_MM = 1;

const round = (mm: number) => Math.round(mm * 10) / 10;

/** Which sides a handle drags: -1 the start (n/w), 1 the end (s/e), 0 neither. */
function sides(handle: Handle) {
  return {
    sx: handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0,
    sy: handle.startsWith("s") ? 1 : handle.startsWith("n") ? -1 : 0,
  };
}

/** Grows or shrinks one span from the side `s` names, never below MIN_MM. */
function resizeSpan(start: number, length: number, delta: number, s: number) {
  if (s === 0) return { start, length };
  const next = Math.max(MIN_MM, length + s * delta);
  return { start: s < 0 ? start + length - next : start, length: next };
}

/** Moves by dx/dy; with Shift only along the larger of the two. */
function move(el: LabelElement, { dx, dy, shift }: Gesture): Geometry {
  if (shift) {
    if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
    else dx = 0;
  }
  return { x: round(el.x + dx), y: round(el.y + dy) };
}

function resize(
  el: LabelElement,
  handle: Handle,
  { dx, dy, shift }: Gesture,
): Geometry {
  const { sx, sy } = sides(handle);

  if (el.type === "text") {
    const w = resizeSpan(el.x, el.width, dx, sx);
    return { x: round(w.start), width: round(w.length) };
  }

  let w = resizeSpan(el.x, el.width, dx, sx);
  let h = resizeSpan(el.y, el.height, dy, sy);
  if ((shift || keepsSquare(el)) && sx && sy) {
    // Keep the aspect ratio, led by whichever side moved further.
    const ratio = el.width / el.height;
    if (w.length / el.width >= h.length / el.height) {
      h = resizeSpan(el.y, el.height, sy * (w.length / ratio - el.height), sy);
    } else {
      w = resizeSpan(el.x, el.width, sx * (h.length * ratio - el.width), sx);
    }
  }
  return {
    x: round(w.start),
    y: round(h.start),
    width: round(w.length),
    height: round(h.length),
  };
}

/** What a move or resize gesture does to `el`, rounded to 0.1mm. */
export function applyGesture(el: LabelElement, gesture: Gesture): Geometry {
  return gesture.mode === "move"
    ? move(el, gesture)
    : resize(el, gesture.mode, gesture);
}
