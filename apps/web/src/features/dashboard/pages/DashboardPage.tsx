import type { ReactNode } from "react";
import { Alert, Box, LinearProgress, Paper, Skeleton, Typography } from "@mui/material";
import type { InventoryMetrics } from "../model/metrics";

type Props = {
  metrics: InventoryMetrics;
  loading: boolean;
  error: string | null;
};

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const count = new Intl.NumberFormat("en-CA");
const pct = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 1 });

const styles = {
  root: { flex: 1, overflow: "auto", p: { xs: 2, sm: 3 } },
  grid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    maxWidth: 1000,
  },
  tile: { p: 2.5, display: "flex", flexDirection: "column", gap: 0.5 },
  value: { fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  bar: { mt: 1, height: 6, borderRadius: 3 },
};

function StatTile({
  label,
  value,
  caption,
  loading,
  children,
}: {
  label: string;
  value: string;
  caption: string;
  loading: boolean;
  children?: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={styles.tile}>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography sx={styles.value}>{loading ? <Skeleton width="60%" /> : value}</Typography>
      {!loading && children}
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    </Paper>
  );
}

export function DashboardPage({ metrics, loading, error }: Props) {
  return (
    <Box sx={styles.root}>
      <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
        Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={styles.grid}>
        <StatTile
          label="Inventory"
          value={pct.format(metrics.inventoryPct)}
          caption="Of one build's parts on hand"
          loading={loading}
        >
          <LinearProgress
            variant="determinate"
            value={metrics.inventoryPct * 100}
            aria-label="Inventory percent"
            sx={styles.bar}
          />
        </StatTile>
        <StatTile
          label="Inventory count"
          value={count.format(metrics.onHandCount)}
          caption="Total parts on hand"
          loading={loading}
        />
        <StatTile
          label="Inventory value"
          value={cad.format(metrics.onHandValue)}
          caption={
            metrics.unpricedInStock
              ? `On hand × price · ${metrics.unpricedInStock} stocked part${metrics.unpricedInStock === 1 ? "" : "s"} without a price`
              : "On hand × price"
          }
          loading={loading}
        />
      </Box>
    </Box>
  );
}
