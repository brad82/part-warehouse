import { useMemo, useState } from "react";
import {
  attributeDefCreateSchema,
  type AttributeDataType,
  type AttributeDef,
  type AttributeDefCreate,
} from "@parts-warehouse/shared";
import { slug } from "./slug";

export type AttributeFormValues = {
  label: string;
  key: string;
  dataType: AttributeDataType;
  unit: string;
  /** Comma-separated; select only. */
  options: string;
  sort: string;
  partTypeIds: string[];
};

function toValues(def: AttributeDef | null): AttributeFormValues {
  return {
    label: def?.label ?? "",
    key: def?.key ?? "",
    dataType: def?.dataType ?? "text",
    unit: def?.unit ?? "",
    options: def?.options?.join(", ") ?? "",
    sort: def ? String(def.sort) : "",
    partTypeIds: def?.partTypeIds ?? [],
  };
}

/**
 * Form state for adding or editing an attribute definition. On a new one
 * the key follows the label until edited by hand. System attributes keep
 * their key and type (the dialog disables those fields).
 */
export function useAttributeForm(def: AttributeDef | null) {
  const [values, setValues] = useState(() => toValues(def));
  const [keyEdited, setKeyEdited] = useState(def != null);
  const [showErrors, setShowErrors] = useState(false);

  const parsed = useMemo(
    () =>
      attributeDefCreateSchema.safeParse({
        label: values.label,
        key: values.key,
        dataType: values.dataType,
        unit: values.unit.trim() || null,
        options:
          values.dataType === "select"
            ? values.options
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
        sort: values.sort.trim() === "" ? undefined : Number(values.sort),
        partTypeIds: values.partTypeIds,
      }),
    [values],
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<keyof AttributeFormValues, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as keyof AttributeFormValues] ??= issue.message;
      }
    }
    return errors;
  }, [parsed]);

  function setField<K extends keyof AttributeFormValues>(key: K, value: AttributeFormValues[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "label" && !keyEdited) next.key = slug(String(value));
      return next;
    });
    if (key === "key") setKeyEdited(true);
  }

  function togglePartType(id: string) {
    setValues((v) => ({
      ...v,
      partTypeIds: v.partTypeIds.includes(id)
        ? v.partTypeIds.filter((t) => t !== id)
        : [...v.partTypeIds, id],
    }));
  }

  /** The validated body, or null (and errors shown). */
  function result(): AttributeDefCreate | null {
    if (parsed.success) return parsed.data;
    setShowErrors(true);
    return null;
  }

  return {
    values,
    fieldErrors: showErrors ? fieldErrors : {},
    setField,
    togglePartType,
    result,
  };
}
