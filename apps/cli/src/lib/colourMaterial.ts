const MATERIAL = /^(.*?)\s*\b((?:PETG|PLA|ABS|ASA|TPU)(?:\s+\S+)?)$/i;

/**
 * Splits the index's "Colour / material" text, e.g. "Yellow/Black TPU 85A-90A"
 * → Yellow/Black + TPU 85A-90A. Defaults follow the index: blank → Black
 * PETG, colour only → PETG, material only → Black.
 */
export function splitColourMaterial(text: string): { colour: string; material: string } {
  const trimmed = text.trim();
  const match = MATERIAL.exec(trimmed);
  if (!match) return { colour: trimmed || "Black", material: "PETG" };
  return { colour: match[1] || "Black", material: match[2].toUpperCase() };
}
