import { Box, Stack } from "@mui/material";
import type { Transaction } from "../../types";
import { CategorySpendChart, DailySpendChart, EmployeeSpendTrendChart } from "./DailySpendChart";

export function AdminAnalyticsCharts({
  transactions,
  departments,
  drillKey,
  onDrill,
  loading = false,
}: {
  byCategory?: { name: string; value: number }[];
  transactions: Transaction[];
  departments: string[];
  drillKey: string;
  onDrill: (key: string) => void;
  loading?: boolean;
}) {
  return (
    <Stack spacing={1.5}>
      <DailySpendChart transactions={transactions} loading={loading} portal="admin" />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <CategorySpendChart
          transactions={transactions}
          loading={loading}
          portal="admin"
          drillKey={drillKey}
          onDrill={onDrill}
        />
        <EmployeeSpendTrendChart
          transactions={transactions}
          loading={loading}
          portal="admin"
          departments={departments}
          drillKey={drillKey}
          onDrill={onDrill}
        />
      </Box>
    </Stack>
  );
}
