import bwipjs from "bwip-js/browser";

/** Code128 of the part code, as an SVG string. Text is printed separately. */
export function code128Svg(code: string): string {
  return bwipjs.toSVG({ bcid: "code128", text: code, height: 8, scale: 2 });
}

/** QR of the part code (payload is the code only; BWIPP default ECC level M). */
export function qrSvg(code: string): string {
  return bwipjs.toSVG({ bcid: "qrcode", text: code, scale: 2 });
}
