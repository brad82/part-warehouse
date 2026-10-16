import { BufferGeometry } from "three";
import { STLLoader } from "three-stdlib";
import { API_BASE_URL } from "@shared/api/baseApi";

export class StlNotFoundError extends Error {}

/**
 * Fetches and parses a part's STL. Rotated Z-up → Y-up and centred on the
 * origin, so callers only need to frame it.
 */
export async function fetchStlGeometry(
  code: string,
  signal?: AbortSignal,
): Promise<BufferGeometry> {
  const res = await fetch(`${API_BASE_URL}/parts/${code}/stl`, { signal });
  if (res.status === 404) throw new StlNotFoundError("No STL file");
  if (!res.ok) throw new Error(`STL request failed (${res.status})`);
  const geometry = new STLLoader().parse(await res.arrayBuffer());
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}
