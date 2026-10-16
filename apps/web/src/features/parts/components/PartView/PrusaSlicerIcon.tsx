/** PrusaSlicer logo, from the app's own icons/PrusaSlicer.svg. */
export function PrusaSlicerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 800 800" aria-hidden="true">
      <circle cx="400" cy="400" r="400" fill="#fff" />
      <path d="M599.3,186.8c-93.9-93.9-246.1-93.9-340,0s-93.9,246.1,0,340Z" fill="#363636" />
      <path d="M202.7,612.5c93.9,93.9,246.1,93.9,340,0s93.9-246.1,0-340" fill="#ed6b21" />
    </svg>
  );
}
