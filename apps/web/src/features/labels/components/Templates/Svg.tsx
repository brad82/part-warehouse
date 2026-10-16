import { Box, type BoxProps } from "@mui/material";

/** Inlines a bwip-js SVG string, stretched to its box. */
export function Svg({ svg, sx }: { svg: string; sx?: BoxProps["sx"] }) {
  return (
    <Box
      sx={{ lineHeight: 0, "& svg": { width: "100%", height: "100%" }, ...sx }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
