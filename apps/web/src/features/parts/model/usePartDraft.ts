import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseAttributeValue,
  partUpdateSchema,
  type AttributeDef,
  type AttributeValue,
  type Part,
  type PartUpdate,
} from "@parts-warehouse/shared";

/**
 * Form values as typed: numbers stay strings until submit. Name and stock
 * (on hand, status) aren't here: the header's rename and the stock strip
 * save them straight away, so a form Save never sends a stale copy.
 */
export type PartDraftValues = {
  revision: string;
  partTypeId: string;
  qtyPerBuild: string;
  notes: string;
  /** By attribute key; "" is unset. */
  attributes: Record<string, string>;
};

export type CoreField = Exclude<keyof PartDraftValues, "attributes">;

/** Error key for an attribute field, alongside the core field names. */
export const attrErrorKey = (key: string) => `attributes.${key}`;

function toValues(part: Part): PartDraftValues {
  const str = (v: number | string | null) => (v == null ? "" : String(v));
  return {
    revision: str(part.revision),
    partTypeId: part.partTypeId,
    qtyPerBuild: str(part.qtyPerBuild),
    notes: str(part.notes),
    attributes: Object.fromEntries(
      Object.entries(part.attributes).map(([k, v]) => [k, String(v)]),
    ),
  };
}

const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));
const optStr = (s: string) => (s.trim() === "" ? null : s.trim());

/** Keys whose text differs from the saved part. */
function changedAttributes(values: PartDraftValues, original: PartDraftValues) {
  const keys = new Set([
    ...Object.keys(values.attributes),
    ...Object.keys(original.attributes),
  ]);
  return [...keys].filter(
    (k) => (values.attributes[k] ?? "").trim() !== (original.attributes[k] ?? ""),
  );
}

/**
 * Only changed attributes are sent (and validated), so a stale value that no
 * longer fits its definition never blocks an unrelated save.
 */
function parseAttributes(
  values: PartDraftValues,
  original: PartDraftValues,
  defs: AttributeDef[],
) {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const update: Record<string, AttributeValue | null> = {};
  const errors: Record<string, string> = {};
  for (const key of changedAttributes(values, original)) {
    const raw = values.attributes[key] ?? "";
    const def = byKey.get(key);
    if (!def) continue;
    if (raw.trim() === "") {
      update[key] = null;
      continue;
    }
    const parsed = parseAttributeValue(def, raw);
    if (parsed.ok) update[key] = parsed.value;
    else errors[attrErrorKey(key)] = parsed.error;
  }
  return { update, errors };
}

function toCoreUpdate(v: PartDraftValues) {
  return {
    revision: num(v.revision),
    partTypeId: v.partTypeId,
    qtyPerBuild: num(v.qtyPerBuild),
    notes: optStr(v.notes),
  };
}

const CORE_FIELDS: CoreField[] = ["revision", "partTypeId", "qtyPerBuild", "notes"];

/**
 * A newer saved part with the user's unsaved edits kept on top: each field
 * still showing the old saved value takes the new one.
 */
function rebase(
  values: PartDraftValues,
  prev: PartDraftValues,
  next: PartDraftValues,
): PartDraftValues {
  const pick = (mine: string, old: string, theirs: string) =>
    mine === old ? theirs : mine;
  const keys = new Set([...Object.keys(values.attributes), ...Object.keys(next.attributes)]);
  return {
    ...(Object.fromEntries(
      CORE_FIELDS.map((k) => [k, pick(values[k], prev[k], next[k])]),
    ) as Omit<PartDraftValues, "attributes">),
    attributes: Object.fromEntries(
      [...keys].map((k) => [
        k,
        pick(values.attributes[k] ?? "", prev.attributes[k] ?? "", next.attributes[k] ?? ""),
      ]),
    ),
  };
}

/**
 * Owns the edit form for one part: field values, dirty flag, per-field
 * errors and a validated submit. Resets when a different part arrives or
 * after its own save; a newer save from elsewhere (rename, stock strip) is
 * merged under any unsaved edits instead. Knows nothing about RTK Query or
 * layout; `onSave` is injected.
 */
export function usePartDraft(
  part: Part | undefined,
  defs: AttributeDef[],
  onSave: (update: PartUpdate) => Promise<void>,
) {
  const [values, setValues] = useState<PartDraftValues | null>(
    part ? toValues(part) : null,
  );
  const [showErrors, setShowErrors] = useState(false);
  const original = useMemo(() => (part ? toValues(part) : null), [part]);
  const previous = useRef({ code: part?.code, original });
  const justSaved = useRef(false);

  useEffect(() => {
    const prev = previous.current;
    previous.current = { code: part?.code, original };
    const prevOriginal = prev.original;
    if (!original || !prevOriginal || prev.code !== part?.code || justSaved.current) {
      justSaved.current = false;
      setValues(original);
      setShowErrors(false);
      return;
    }
    setValues((current) => (current ? rebase(current, prevOriginal, original) : original));
  }, [part?.code, part?.updatedAt]);

  const parsed = useMemo(() => {
    if (!values || !original) return null;
    const core = partUpdateSchema.safeParse(toCoreUpdate(values));
    const attributes = parseAttributes(values, original, defs);
    const errors: Record<string, string> = { ...attributes.errors };
    if (!core.success) {
      for (const issue of core.error.issues) {
        errors[String(issue.path[0])] = "Check this value";
      }
    }
    const update: PartUpdate | null =
      core.success && Object.keys(attributes.errors).length === 0
        ? { ...core.data, attributes: attributes.update }
        : null;
    return { update, errors };
  }, [values, original, defs]);

  const dirty = useMemo(() => {
    if (!original || !values) return false;
    return (
      CORE_FIELDS.some((k) => values[k] !== original[k]) ||
      changedAttributes(values, original).length > 0
    );
  }, [original, values]);

  function setField<K extends CoreField>(key: K, value: PartDraftValues[K]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function setAttribute(key: string, value: string) {
    setValues((current) =>
      current
        ? { ...current, attributes: { ...current.attributes, [key]: value } }
        : current,
    );
  }

  async function submit() {
    if (!parsed) return;
    if (!parsed.update) {
      setShowErrors(true);
      return;
    }
    // The refetched part then replaces the draft outright.
    justSaved.current = true;
    try {
      await onSave(parsed.update);
    } catch {
      justSaved.current = false;
      // The container surfaces the mutation error as `saveError`.
    }
  }

  function reset() {
    setValues(original);
    setShowErrors(false);
  }

  return {
    values,
    dirty,
    fieldErrors: showErrors ? (parsed?.errors ?? {}) : {},
    valid: parsed?.update != null,
    setField,
    setAttribute,
    submit,
    reset,
  };
}

export type PartDraft = ReturnType<typeof usePartDraft>;
