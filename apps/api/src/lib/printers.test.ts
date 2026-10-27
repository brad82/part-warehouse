import { describe, expect, it } from "vitest";
import { parseLpstat, parsePageSizes, pickMedia } from "./printers.js";

// Trimmed `lpoptions -p DYMO_LabelWriter_450 -l`.
const DYMO = [
  "PrintQuality/Print Quality: Text *Graphics",
  "PageSize/Media Size: w154h64 w72h154 w118h252 *w167h288 w167h288.1 w167h288.2 w154h286",
  "DymoHalftoning/Halftoning: *Default ErrorDiffusion",
].join("\n");

describe("parsePageSizes", () => {
  it("lists the PageSize choices without the default marker", () => {
    expect(parsePageSizes(DYMO)).toEqual([
      "w154h64", "w72h154", "w118h252", "w167h288", "w167h288.1", "w167h288.2", "w154h286",
    ]);
  });

  it("is empty when the printer lists no sizes", () => {
    expect(parsePageSizes("PrintQuality/Print Quality: *Text")).toEqual([]);
  });
});

describe("pickMedia", () => {
  const sizes = parsePageSizes(DYMO);

  it("matches the driver size within a point", () => {
    // 30857 badge: 58.76×101.6mm = 166.6×288pt.
    expect(pickMedia(sizes, 58.76, 101.6)).toBe("w167h288");
    // 11356 name badge: 41.6×88.9mm = 117.9×252pt.
    expect(pickMedia(sizes, 41.6, 88.9)).toBe("w118h252");
  });

  it("falls back to a CUPS custom size", () => {
    expect(pickMedia(sizes, 62, 100)).toBe("Custom.62x100mm");
  });
});

describe("parseLpstat", () => {
  it("reads each printer's state and any message line", () => {
    const out = [
      "printer Canon_TS3100_series is idle.  enabled since Sat 24 May 20:33:20 2025",
      "printer DYMO_LabelWriter_450 is idle.  enabled since Tue 27 Oct 13:44:25 2026",
      "\tOut of labels.",
      "printer Office disabled since Tue 27 Oct 09:00:00 2026 -",
      "\tPaused",
      "printer Shed now printing Shed-12.  enabled since Tue 27 Oct 10:00:00 2026",
    ].join("\n");
    expect(parseLpstat(out)).toEqual([
      { name: "Canon_TS3100_series", enabled: true, status: "idle" },
      { name: "DYMO_LabelWriter_450", enabled: true, status: "Out of labels." },
      { name: "Office", enabled: false, status: "Paused" },
      { name: "Shed", enabled: true, status: "printing" },
    ]);
  });
});
