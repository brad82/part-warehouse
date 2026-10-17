import { useEffect, useRef, useState } from "react";
import { partUpdateSchema, type Part, type PartStatus, type PartUpdate } from "@snowcat/shared";
import { stockCoverage } from "./stockCoverage";

/**
 * On hand and status for the stock strip. Each change saves at once (like
 * the BOM grid's inline edit) and shows straight away; a failed save puts
 * the saved value back and reports the error. The on-hand text is only
 * saved on commit (blur / Enter), not per keystroke. `onSave` is injected
 * and throws a readable Error on failure.
 */
export function usePartStock(
  part: Part | undefined,
  onSave: (update: PartUpdate) => Promise<void>,
) {
  const [onHandText, setOnHandText] = useState(part ? String(part.onHand) : "");
  const [status, setStatus] = useState<PartStatus | undefined>(part?.status);
  const [error, setError] = useState<string | null>(null);
  // Saves in flight; their refetches would briefly show older values.
  const pending = useRef(0);

  useEffect(() => {
    if (pending.current > 0) return;
    setOnHandText(part ? String(part.onHand) : "");
    setStatus(part?.status);
  }, [part?.code, part?.onHand, part?.status]);

  useEffect(() => setError(null), [part?.code]);

  async function save(update: PartUpdate) {
    pending.current += 1;
    try {
      await onSave(update);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      if (part) {
        setOnHandText(String(part.onHand));
        setStatus(part.status);
      }
    } finally {
      pending.current -= 1;
    }
  }

  const parsed = partUpdateSchema.shape.onHand.safeParse(
    onHandText.trim() === "" ? Number.NaN : Number(onHandText),
  );
  const onHand = parsed.success && parsed.data != null ? parsed.data : (part?.onHand ?? 0);

  function setOnHand(next: number) {
    if (!part) return;
    const value = Math.max(0, next);
    setOnHandText(String(value));
    if (value !== part.onHand) void save({ onHand: value });
  }

  /** Saves the typed value, or puts the saved one back if it doesn't parse. */
  function commitOnHand() {
    if (!part) return;
    if (!parsed.success || parsed.data == null) {
      setOnHandText(String(part.onHand));
      return;
    }
    setOnHand(parsed.data);
  }

  function changeStatus(next: PartStatus) {
    if (!part || next === status) return;
    setStatus(next);
    void save({ status: next });
  }

  return {
    part,
    onHandText,
    onHand,
    qtyPerBuild: part?.qtyPerBuild ?? 0,
    coverage: stockCoverage(onHand, part?.qtyPerBuild ?? 0),
    status: status ?? "planned",
    error,
    setOnHandText,
    commitOnHand,
    increment: () => setOnHand(onHand + 1),
    decrement: () => setOnHand(onHand - 1),
    changeStatus,
    clearError: () => setError(null),
  };
}

export type PartStock = ReturnType<typeof usePartStock>;
