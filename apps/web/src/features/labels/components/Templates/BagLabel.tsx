import { Box } from "@mui/material";
import { ATTR, attrText, colourMaterial, type Part } from "@snowcat/shared";
import { code128Svg, qrSvg } from "../../model/barcodes";
import { Svg } from "./Svg";

type Props = { part: Part; render: string | null };

// Printed output: fixed black-on-white in mm, never theme colours.
const bagStyles = {
  root: {
    width: "62mm",
    height: "100mm",
    p: "3mm",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "1.5mm",
    color: "#000",
    bgcolor: "#fff",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1.2,
    overflow: "hidden",
  },
  name: { fontSize: "13pt", fontWeight: 700, lineHeight: 1.1 },
  code: { fontFamily: "Menlo, monospace", fontSize: "11pt", fontWeight: 700 },
  meta: { display: "flex", justifyContent: "space-between", fontSize: "9pt" },
  qty: { fontSize: "16pt", fontWeight: 800 },
  render: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& img": { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  },
  codes: { display: "flex", alignItems: "flex-end", gap: "2mm" },
  code128: { flex: 1, height: "12mm" },
  qr: { width: "17mm", height: "17mm", flexShrink: 0 },
};

/** Purchased parts (with a SKU) show supplier · SKU; printed ones colour + material. */
function detail(part: Part): string {
  const sku = attrText(part, ATTR.sku);
  if (sku) return [attrText(part, ATTR.supplier), sku].filter(Boolean).join(" · ");
  return colourMaterial(part);
}

/** QL-800 bag label: name, code, expected qty, detail, render, barcodes. */
export function BagLabel({ part, render }: Props) {
  return (
    <Box sx={bagStyles.root}>
      <Box sx={bagStyles.name}>{part.name}</Box>
      <Box sx={bagStyles.code}>{part.code}</Box>
      <Box sx={bagStyles.meta}>
        <span>{detail(part)}</span>
        <span>Rev {part.revision}</span>
      </Box>
      <Box sx={bagStyles.qty}>Qty {part.qtyPerBuild}</Box>
      <Box sx={bagStyles.render}>
        {render ? <img src={render} alt="" /> : null}
      </Box>
      <Box sx={bagStyles.codes}>
        <Svg svg={code128Svg(part.code)} sx={bagStyles.code128} />
        <Svg svg={qrSvg(part.code)} sx={bagStyles.qr} />
      </Box>
    </Box>
  );
}
