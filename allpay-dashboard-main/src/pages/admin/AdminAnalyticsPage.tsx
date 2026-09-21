import { lazy, Suspense, useMemo, useState } from "react";
import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { adminApi } from "../../api/adminApi";
import {
  AdminCard,
  AdminKpi,
  AdminKpiRow,
  AdminPage,
  AdminPageLoader,
  AdminSegmentedControl,
} from "../../components/admin/ui";
import { useAdminData } from "../../context/AdminDataContext";
import { adminKeys } from "../../query/adminKeys";
import { ADMIN } from "../../theme";
import { inr } from "../../utils/labels";

const AdminAnalyticsCharts = lazy(() =>
  import("../../components/charts/AdminAnalyticsCharts").then((m) => ({ default: m.AdminAnalyticsCharts }))
);

const RANGE_OPTIONS = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
] as const;

export const AdminAnalyticsPage = () => {
  const { transactions, filteredTransactions, departments } = useAdminData();
  const [range, setRange] = useState("30");
  const [drillKey, setDrillKey] = useState("");

  const analyticsQuery = useQuery({
    queryKey: adminKeys.analytics(range),
    queryFn: async () => {
      const end = dayjs();
      const start = end.subtract(Number(range), "day");
      const ymd = end.format("YYYY-MM-DD");
      const [today, agg] = await Promise.all([
        adminApi.getDailySpend(ymd),
        adminApi.getAnalyticsAggregated({
          startDate: start.format("YYYY-MM-DD"),
          endDate: end.format("YYYY-MM-DD"),
          timelineBucket: "daily",
        }),
      ]);
      return { today, agg };
    },
    placeholderData: keepPreviousData,
  });

  const rangeStart = useMemo(() => dayjs().subtract(Number(range), "day"), [range]);
  const inRange = useMemo(
    () => filteredTransactions.filter((tx) => dayjs(tx.dateTime).isAfter(rangeStart)),
    [filteredTransactions, rangeStart]
  );

  const byCategory = useMemo(
    () =>
      (analyticsQuery.data?.agg?.byCategory ?? []).map((c) => ({
        name: c.category,
        value: c.total,
      })),
    [analyticsQuery.data?.agg]
  );

  const hasData = Boolean(analyticsQuery.data);
  const showFullLoader = analyticsQuery.isPending && !hasData;
  const loadError = analyticsQuery.error
    ? (analyticsQuery.error as Error).message
    : "";

  const kpis = analyticsQuery.data?.agg?.kpis;
  const today = analyticsQuery.data?.today;
  const drilled = inRange.filter(
    (tx) => !drillKey || tx.category === drillKey || tx.employeeName === drillKey
  );

  const totalWindowSpend =
    (kpis?.approvedSpend ?? 0) + (kpis?.pendingSpend ?? 0) + (kpis?.rejectedAmount ?? 0);
  const approvedPct =
    totalWindowSpend > 0 ? Math.round(((kpis?.approvedSpend ?? 0) / totalWindowSpend) * 100) : 0;
  const pendingPct =
    totalWindowSpend > 0 ? Math.round(((kpis?.pendingSpend ?? 0) / totalWindowSpend) * 100) : 0;

  return (
    <AdminPage
      title="Spend analytics"
      description={`Server totals for the last ${range} days. Charts below let you drill into categories and employees.`}
      actions={
        <AdminSegmentedControl
          aria-label="Analytics range"
          value={range}
          options={RANGE_OPTIONS}
          onChange={setRange}
          disabled={showFullLoader}
        />
      }
    >
      {showFullLoader ? (
        <AdminPageLoader label="Loading spend analytics…" />
      ) : (
        <>
          {loadError ? <Alert severity="error">{loadError}</Alert> : null}
          {analyticsQuery.isFetching && hasData ? (
            <Typography variant="caption" color="text.secondary">
              Updating…
            </Typography>
          ) : null}

          {today && !loadError ? (
            <AdminCard
              className="claim-fade-up claim-fade-up-delay-1"
              sx={{
                borderLeft: "3px solid",
                borderLeftColor: today.totalSpend > 0 ? ADMIN.accent.primary : "#CBD5E1",
              }}
              contentSx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
                gap: 1.5,
                alignItems: "center",
                py: 1.5,
              }}
            >
              <Box>
                <Typography variant="overline" display="block">
                  Today
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(today.date).format("ddd, DD MMM YYYY")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ letterSpacing: "-0.02em" }}>
                  {inr(today.totalSpend)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {today.transactionCount === 0
                    ? "No claims posted today"
                    : `${today.transactionCount} claim${today.transactionCount === 1 ? "" : "s"} today`}
                </Typography>
              </Box>
              <Box sx={{ justifySelf: { md: "end" } }}>
                {today.byCategory[0] ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Top: ${today.byCategory[0].category} · ${inr(today.byCategory[0].total)}`}
                  />
                ) : (
                  <Chip size="small" variant="outlined" label="Quiet day" />
                )}
              </Box>
            </AdminCard>
          ) : null}

          {!loadError ? (
            <Box>
              <AdminKpiRow>
                <Box className="claim-fade-up claim-fade-up-delay-1" sx={{ flex: 1, minWidth: 0 }}>
                  <AdminKpi label="Approved" value={inr(kpis?.approvedSpend ?? 0)} accent="success" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, px: 0.25 }}>
                    {totalWindowSpend > 0 ? `${approvedPct}% of window spend` : "No spend in window"}
                  </Typography>
                </Box>
                <Box className="claim-fade-up claim-fade-up-delay-2" sx={{ flex: 1, minWidth: 0 }}>
                  <AdminKpi label="Pending" value={inr(kpis?.pendingSpend ?? 0)} accent="warning" />
                  {totalWindowSpend > 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, px: 0.25 }}>
                      {`${pendingPct}% awaiting review`}
                    </Typography>
                  ) : null}
                </Box>
                <Box className="claim-fade-up claim-fade-up-delay-3" sx={{ flex: 1, minWidth: 0 }}>
                  <AdminKpi label="Rejected" value={inr(kpis?.rejectedAmount ?? 0)} accent="slate" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, px: 0.25 }}>
                    Amount declined
                  </Typography>
                </Box>
                <Box className="claim-fade-up claim-fade-up-delay-4" sx={{ flex: 1, minWidth: 0 }}>
                  <AdminKpi label="Flagged" value={String(kpis?.flaggedCount ?? 0)} accent="error" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, px: 0.25 }}>
                    Claims needing attention
                  </Typography>
                </Box>
              </AdminKpiRow>
            </Box>
          ) : null}

          {drillKey ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary">
                Focused on
              </Typography>
              <Chip
                label={`${drillKey} · ${drilled.length} claim${drilled.length === 1 ? "" : "s"}`}
                onDelete={() => setDrillKey("")}
                color="primary"
                variant="outlined"
              />
            </Stack>
          ) : null}

          {!loadError ? (
            <Suspense fallback={<AdminPageLoader label="Loading charts…" />}>
              <AdminAnalyticsCharts
                byCategory={byCategory}
                transactions={transactions}
                departments={departments}
                drillKey={drillKey}
                onDrill={setDrillKey}
              />
            </Suspense>
          ) : null}
        </>
      )}
    </AdminPage>
  );
};
