import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

export type CameraState = "idle" | "starting" | "scanning" | "unavailable";

/**
 * Owns the camera stream and Code128/QR decoding into a <video>. Calls
 * `onText` once per distinct read. Knows nothing about part codes or
 * navigation. ZXing loads lazily so it stays out of the main bundle.
 */
export function useCameraScanner(
  enabled: boolean,
  onText: (text: string) => void,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      return;
    }
    let controls: IScannerControls | undefined;
    let cancelled = false;
    let last = "";
    setState("starting");

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera API");
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE],
          ],
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const video = videoRef.current;
        if (cancelled || !video) return;
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video,
          (result) => {
            const text = result?.getText();
            if (!text || text === last) return;
            last = text;
            onTextRef.current(text);
          },
        );
        if (cancelled) controls.stop();
        else setState("scanning");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [enabled]);

  return { videoRef, state };
}
