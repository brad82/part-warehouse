import { useState } from "react";
import { parseScan } from "@parts-warehouse/shared";

/**
 * Turns raw scanned text into a confirmed part code. `lookup` resolves
 * whether the code exists; `onFound` fires for a known part. Owns the error
 * message for unreadable or unknown codes.
 */
export function useScanLookup(
  lookup: (code: string) => Promise<boolean>,
  onFound: (code: string) => void,
) {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handle(text: string) {
    const code = parseScan(text);
    if (!code) {
      setError(`Not a part code: "${text.trim()}"`);
      return;
    }
    setChecking(true);
    try {
      if (await lookup(code)) {
        setError(null);
        onFound(code);
      } else {
        setError(`Part not found: ${code}`);
      }
    } finally {
      setChecking(false);
    }
  }

  return { error, checking, handle, clearError: () => setError(null) };
}
