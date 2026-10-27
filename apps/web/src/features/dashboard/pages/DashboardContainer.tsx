import { useMemo } from "react";
import { errorMessage } from "@shared/api/errors";
import { useListPartsQuery } from "@shared/api/catalogApi";
import { inventoryMetrics } from "../model/metrics";
import { DashboardPage } from "./DashboardPage";

const EMPTY: never[] = [];

/** The only place the dashboard feature calls RTK Query. */
export function DashboardContainer() {
  const parts = useListPartsQuery();
  const metrics = useMemo(() => inventoryMetrics(parts.data ?? EMPTY), [parts.data]);

  return (
    <DashboardPage
      metrics={metrics}
      loading={parts.isLoading}
      error={errorMessage(parts.error, "Couldn't load inventory.")}
    />
  );
}
