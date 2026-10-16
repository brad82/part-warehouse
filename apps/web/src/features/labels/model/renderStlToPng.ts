import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { fetchStlGeometry } from "@shared/lib/stl";

/**
 * Renders a part's STL to a PNG data URL for printing: fixed isometric view,
 * white background, mid-grey shading that dithers well on a thermal head.
 * Returns null when the part has no STL or WebGL is unavailable.
 */
export async function renderStlToPng(
  code: string,
  sizePx = 600,
): Promise<string | null> {
  let geometry;
  try {
    geometry = await fetchStlGeometry(code);
  } catch {
    return null;
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch {
    geometry.dispose();
    return null;
  }
  renderer.setSize(sizePx, sizePx, false);

  const scene = new Scene();
  scene.background = new Color("#ffffff");
  const material = new MeshStandardMaterial({ color: "#8a8a8a", roughness: 0.7 });
  scene.add(new Mesh(geometry, material));
  scene.add(new AmbientLight("#ffffff", 0.9));
  const key = new DirectionalLight("#ffffff", 2.2);
  key.position.set(4, 8, 6);
  scene.add(key);
  const fill = new DirectionalLight("#ffffff", 0.6);
  fill.position.set(-6, 2, -4);
  scene.add(fill);

  geometry.computeBoundingBox();
  const sphere = (geometry.boundingBox ?? new Box3()).getBoundingSphere(new Sphere());
  const r = sphere.radius * 1.05;
  const camera = new OrthographicCamera(-r, r, r, -r, 0.1, r * 10);
  camera.position.copy(new Vector3(1, 0.9, 1).normalize().multiplyScalar(r * 4));
  camera.lookAt(sphere.center);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  geometry.dispose();
  material.dispose();
  renderer.dispose();
  return url;
}
