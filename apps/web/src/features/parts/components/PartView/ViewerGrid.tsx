import { useMemo } from "react";
import { Grid, Line } from "@react-three/drei";
import { Vector3, type BufferGeometry } from "three";

type Props = {
  geometry: BufferGeometry;
  dark: boolean;
};

// Printer axes in the viewer's Y-up space (fetchStlGeometry rotates Z-up → Y-up):
// printer X = +x, printer Y = −z, printer Z = +y.
const AXES = [
  { dir: [1, 0, 0], colour: "#e5484d" },
  { dir: [0, 0, -1], colour: "#30a46c" },
  { dir: [0, 1, 0], colour: "#3e8ef7" },
] as const;

/**
 * Grid cell size in mm: a power of ten giving roughly 5–50 cells across the
 * part. Sections are every 10 cells.
 */
export function gridCellSize(maxDim: number): number {
  return 10 ** Math.floor(Math.log10(Math.max(maxDim, 1) / 5));
}

/** Floor height, grid cell size (mm) and axis length for a centred part. */
export function useGridMetrics(geometry: BufferGeometry) {
  return useMemo(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return { floor: box.min.y, cell: gridCellSize(maxDim), axisLength: maxDim * 0.75 };
  }, [geometry]);
}

/** Floor grid under the part plus printer X/Y/Z axes from the grid origin. */
export function ViewerGrid({ geometry, dark }: Props) {
  const { floor, cell, axisLength } = useGridMetrics(geometry);

  return (
    <group position={[0, floor, 0]}>
      <Grid
        infiniteGrid
        cellSize={cell}
        sectionSize={cell * 10}
        cellThickness={0.6}
        sectionThickness={1.2}
        cellColor={dark ? "#3a3f45" : "#c4c8cf"}
        sectionColor={dark ? "#5c636c" : "#8b929c"}
        fadeDistance={axisLength * 40}
        fadeStrength={1.5}
      />
      {AXES.map((a) => (
        <Line
          key={a.colour}
          points={[
            [0, 0.01, 0],
            [a.dir[0] * axisLength, a.dir[1] * axisLength + 0.01, a.dir[2] * axisLength],
          ]}
          color={a.colour}
          lineWidth={2}
        />
      ))}
    </group>
  );
}
