import { Box } from "@mui/material";
import type { Part } from "@snowcat/shared";
import { qrSvg } from "../../model/barcodes";
import { Svg } from "./Svg";

type Props = { part: Part };

const smallStyles = {
  root: {
    width: "25mm",
    height: "25mm",
    p: "1mm",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#000",
    bgcolor: "#fff",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1.2,
    overflow: "hidden",
    textAlign: "center",
  },
  qr: { width: "15mm", height: "15mm" },
  code: { fontFamily: "Menlo, monospace", fontSize: "5.5pt", fontWeight: 700, mt: "0.5mm" },
  name: {
    fontSize: "5pt",
    lineHeight: 1.1,
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

/** Small label: QR + code + name. Size comes from templates.ts. */
export function SmallLabel({ part }: Props) {
  return (
    <Box sx={smallStyles.root}>
      <Svg svg={qrSvg(part.code)} sx={smallStyles.qr} />
      <Box sx={smallStyles.code}>{part.code}</Box>
      <Box sx={smallStyles.name}>{part.name}</Box>
    </Box>
  );
}
