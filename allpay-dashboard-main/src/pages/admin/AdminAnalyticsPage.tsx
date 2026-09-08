import { lazy, Suspense, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { adminApi } from "../../api/adminApi";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAdminData } from "../../context/AdminDataContext";
import { adminKeys } from "../../query/adminKeys";
import { inr } from "../../utils/labels";

const AdminAnalyticsCharts = lazy(() =>
  import("../../components/charts/AdminAnalyticsCharts").then((m) => ({ default: m.AdminAnalyticsCharts }))
);

const RANGE_OPTIONS = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
] as const;

function PageLoader({ label = "Loading analytics…" }: { label?: string }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        minHeight: "58vh",
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        px: 2,
      }}
    >
      <CircularProgress size={36} thickness={4} />
      <Typography variant="body2" color="text.secondary" fontWeight={650}>
        {label}
      </Typography>
    </Stack>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent,
  delayClass,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  delayClass: string;
}) {
  return (
    <Box
      className={`claim-fade-up ${delayClass}`}
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "#fff",
        borderLeft: "3px solid",
        borderColor: accent,
        px: 1.75,
        py: 1.5,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, letterSpacing: "-0.02em" }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

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
    <Stack spacing={2.25} className="claim-fade-up">
      <PageHeader
        title="Spend analytics"
        description={`Server totals for the last ${range} days. Charts below let you drill into categories and employees.`}
        actions={
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              bgcolor: "#fff",
              p: 0.5,
              border: "1px solid",
              borderColor: "divider",
              opacity: showFullLoader ? 0.7 : 1,
            }}
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.value;
              return (
                <Box
                  key={opt.value}
                  component="button"
                  disabled={showFullLoader}
                  onClick={() => setRange(opt.value)}
                  sx={{
                    border: 0,
                    cursor: showFullLoader ? "wait" : "pointer",
                    px: 1.5,
                    py: 0.65,
                    fontSize: 13,
                    fontWeight: 700,
                    bgcolor: active ? "#111827" : "transparent",
                    color: active ? "#fff" : "text.secondary",
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Stack>
        }
      />

      {showFullLoader ? (
        <PageLoader label="Loading spend analytics…" />
      ) : (
        <>
          {loadError ? <Alert severity="error">{loadError}</Alert> : null}
          {analyticsQuery.isFetching && hasData ? (
            <Typography variant="caption" color="text.secondary">
              Updating…
            </Typography>
          ) : null}

          {today && !loadError ? (
            <Box
              className="claim-fade-up claim-fade-up-delay-1"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
                gap: 1.5,
                alignItems: "center",
                bgcolor: "#fff",
                px: 2,
                py: 1.5,
                borderLeft: "3px solid",
                borderColor: today.totalSpend > 0 ? "#2563EB" : "#CBD5E1",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  Today
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(today.date).format("ddd, DD MMM YYYY")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
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
            </Box>
          ) : null}

          {!loadError ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <KpiCard
                label="Approved"
                value={inr(kpis?.approvedSpend ?? 0)}
                hint={totalWindowSpend > 0 ? `${approvedPct}% of window spend` : "No spend in window"}
                accent="#059669"
                delayClass="claim-fade-up-delay-1"
              />
              <KpiCard
                label="Pending"
                value={inr(kpis?.pendingSpend ?? 0)}
                hint={totalWindowSpend > 0 ? `${pendingPct}% awaiting review` : undefined}
                accent="#D97706"
                delayClass="claim-fade-up-delay-2"
              />
              <KpiCard
                label="Rejected"
                value={inr(kpis?.rejectedAmount ?? 0)}
                hint="Amount declined"
                accent="#94A3B8"
                delayClass="claim-fade-up-delay-3"
              />
              <KpiCard
                label="Flagged"
                value={String(kpis?.flaggedCount ?? 0)}
                hint="Claims needing attention"
                accent="#DC2626"
                delayClass="claim-fade-up-delay-4"
              />
            </Stack>
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
            <Suspense fallback={<PageLoader label="Loading charts…" />}>
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
    </Stack>
  );
};
