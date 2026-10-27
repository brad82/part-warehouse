import { errorMessage } from "@shared/api/errors";
import {
  useGetLabelPrinterQuery,
  useListPrintersQuery,
  useSetLabelPrinterMutation,
} from "../api/settingsApi";
import { unwrap } from "../model/unwrap";
import { PrintersPage } from "./PrintersPage";

const EMPTY: never[] = [];

/** Settings → Printers & devices. Feeds PrintersPage from RTK Query. */
export function PrintersContainer() {
  const printers = useListPrintersQuery();
  const labelPrinter = useGetLabelPrinterQuery();
  const [setLabelPrinter] = useSetLabelPrinterMutation();

  return (
    <PrintersPage
      printers={printers.data ?? EMPTY}
      labelPrinter={labelPrinter.data?.printer ?? null}
      loading={printers.isFetching || labelPrinter.isLoading}
      error={
        errorMessage(printers.error, "Couldn't list the server's printers.") ??
        errorMessage(labelPrinter.error, "Couldn't load the label printer.")
      }
      onSelectLabelPrinter={(printer) =>
        unwrap(setLabelPrinter({ printer }), "Couldn't save the label printer.")
      }
      onRefresh={() => void printers.refetch()}
    />
  );
}
