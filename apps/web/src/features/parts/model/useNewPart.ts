import { useEffect, useMemo, useState } from "react";
import { partCreateSchema, type Grouping, type PartCreate, type PartType } from "@parts-warehouse/shared";

type Options = {
  groupings: Grouping[];
  partTypes: PartType[];
  defaultGroupId: string | undefined;
  nextPartNumber: (groupId: string) => Promise<string | null>;
  onCreate: (input: PartCreate) => Promise<string>;
  onCreated: (code: string) => void;
};

export type NewPartValues = {
  groupId: string;
  part: string;
  revision: string;
  name: string;
  partTypeId: string;
  qtyPerBuild: string;
};

/** Parts groups with their sub-assembly, in code order, for the group picker. */
export function groupOptions(groupings: Grouping[]) {
  const byId = new Map(groupings.map((g) => [g.id, g]));
  return groupings
    .filter((g) => g.taxonomy === "group")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => ({ group: g, subassembly: g.parentId ? byId.get(g.parentId) : undefined }));
}

/**
 * Form state for adding a part. Picking a group fills in its next free part
 * number; the code preview updates as you type. Knows nothing about RTK
 * Query; `nextPartNumber` and `onCreate` are injected.
 */
export function useNewPart({
  groupings,
  partTypes,
  defaultGroupId,
  nextPartNumber,
  onCreate,
  onCreated,
}: Options) {
  const initial = (): NewPartValues => ({
    groupId: defaultGroupId ?? "",
    part: "",
    revision: "0",
    name: "",
    partTypeId: partTypes[0]?.id ?? "",
    qtyPerBuild: "1",
  });
  const [values, setValues] = useState<NewPartValues>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [groupFull, setGroupFull] = useState(false);

  useEffect(() => {
    if (!values.groupId) return;
    let cancelled = false;
    nextPartNumber(values.groupId)
      .then((part) => {
        if (cancelled) return;
        setGroupFull(part == null);
        setValues((v) => ({ ...v, part: part ?? "" }));
      })
      .catch(() => {
        // Leave the number for the user to type.
      });
    return () => {
      cancelled = true;
    };
  }, [values.groupId]);

  const parsed = useMemo(
    () =>
      partCreateSchema.safeParse({
        groupId: values.groupId,
        part: values.part.trim(),
        revision: values.revision.trim() === "" ? Number.NaN : Number(values.revision),
        name: values.name,
        partTypeId: values.partTypeId,
        qtyPerBuild: values.qtyPerBuild.trim() === "" ? Number.NaN : Number(values.qtyPerBuild),
      }),
    [values],
  );

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<keyof NewPartValues, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as keyof NewPartValues] ??= issue.message;
      }
    }
    return errors;
  }, [parsed]);

  // Shown as soon as group, revision and number are usable, before a name.
  const part = values.part.trim();
  const revision = values.revision.trim();
  const code =
    values.groupId && /^\d{2}$/.test(part) && /^\d$/.test(revision)
      ? `${values.groupId}-${revision}${part}`
      : null;

  function setField<K extends keyof NewPartValues>(key: K, value: NewPartValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit() {
    if (!parsed.success) {
      setShowErrors(true);
      return;
    }
    try {
      onCreated(await onCreate(parsed.data));
    } catch {
      // The container surfaces the mutation error as `createError`.
    }
  }

  return {
    values,
    code,
    groupFull,
    groups: useMemo(() => groupOptions(groupings), [groupings]),
    fieldErrors: showErrors ? fieldErrors : {},
    setField,
    submit,
  };
}
