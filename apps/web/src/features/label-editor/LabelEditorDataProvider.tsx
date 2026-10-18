import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useDispatch, useSelect } from "@wordpress/data";
import type { Part } from "@snowcat/shared";
import type { FieldOption } from "./model/CanvasContext";
import { store } from "./store";

type Data = {
  parts: Part[];
  /** Part fields then attribute keys, for `{field}` tokens and QR payloads. */
  fields: FieldOption[];
  /** Leaves the editor (unsaved-changes check is the caller's). */
  onExit: () => void;
};

const DataContext = createContext<Data | null>(null);

/**
 * Server data and navigation for the editor, from LabelCreatorContainer.
 * Editor state itself lives in the `store`; this is only what it can't own.
 * Also picks the first part as the sample once parts arrive.
 */
export function LabelCreatorDataProvider({
  children,
  ...data
}: Data & { children: ReactNode }) {
  const partCode = useSelect(
    (select) => select(store).getSample().partCode,
    [],
  );
  const { selectSamplePart } = useDispatch(store);
  const first = data.parts[0]?.code;
  useEffect(() => {
    if (!partCode && first) void selectSamplePart(first);
  }, [partCode, first, selectSamplePart]);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useLabelCreatorData(): Data {
  const data = useContext(DataContext);
  if (!data)
    throw new Error(
      "Label creator hooks must be used within LabelCreatorDataProvider",
    );
  return data;
}

/** The sample part's record, if parts have loaded. */
export function useSamplePart(): Part | null {
  const { parts } = useLabelCreatorData();
  const partCode = useSelect(
    (select) => select(store).getSample().partCode,
    [],
  );
  return parts.find((p) => p.code === partCode) ?? null;
}
