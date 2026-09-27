import { useMemo, useState } from "react";
import type { Transaction } from "../../types";
import { useInsightAnalytics, type InsightPortal } from "../../query/useInsightAnalytics";
import {
  INSIGHT_PERIOD_OPTIONS,
  type InsightPeriodDays,
  filterByCategory,
  insightAmount,
  insightClaims,
  seriesFromNamedTotals,
  seriesFromTimeline,
  seriesFromTransactions,
  uniqueSorted,
} from "../../utils/insightSeries";
import { InsightAreaChart, PillSelect } from "./InsightAreaChart";

const TIMELINE_METRICS = [
  { value: "spend", label: "Spend" },
  { value: "claims", label: "Claims" },
] as const;

export function DailySpendChart({
  transactions = [],
  loading = false,
  portal = "admin",
}: {
  transactions?: Transaction[];
  loading?: boolean;
  portal?: InsightPortal;
}) {
  const [metric, setMetric] = useState<"spend" | "claims">("spend");
  const [period, setPeriod] = useState<InsightPeriodDays>(30);
  const query = useInsightAnalytics(portal, period);

  const series = useMemo(() => {
    if (query.data) {
      return seriesFromTimeline(query.data.current.timeline, query.data.previous.timeline, metric);
    }
    return seriesFromTransactions(
      transactions,
      period,
      metric === "claims" ? insightClaims : insightAmount
    );
  }, [query.data, transactions, period, metric]);

  return (
    <InsightAreaChart
      data={series.points}
      headline={series.currentTotal}
      changePct={series.changePct}
      loading={(loading || query.isPending) && !query.data && series.points.length === 0}
      metrics={[...TIMELINE_METRICS]}
      metric={metric}
      onMetricChange={(value) => setMetric(value as "spend" | "claims")}
      periods={INSIGHT_PERIOD_OPTIONS}
      period={period}
      onPeriodChange={(value) => setPeriod(Number(value) as InsightPeriodDays)}
      height={300}
      emptyLabel="No spend in this window"
    />
  );
}

export function CategorySpendChart({
  transactions = [],
  loading = false,
  portal = "employee",
  drillKey = "",
  onDrill,
}: {
  transactions?: Transaction[];
  loading?: boolean;
  portal?: InsightPortal;
  drillKey?: string;
  onDrill?: (key: string) => void;
}) {
  const [localMetric, setLocalMetric] = useState("all");
  const [period, setPeriod] = useState<InsightPeriodDays>(30);
  const query = useInsightAnalytics(portal, period);

  const categories = useMemo(() => {
    const fromApi = query.data?.current.byCategory.map((row) => row.category) ?? [];
    if (fromApi.length) return uniqueSorted(fromApi);
    return uniqueSorted(transactions.map((tx) => tx.category));
  }, [query.data, transactions]);

  const metric = categories.includes(drillKey) ? drillKey : localMetric;

  const series = useMemo(() => {
    if (metric !== "all") {
      const fromTx = seriesFromTransactions(filterByCategory(transactions, metric), period, insightAmount);
      if (fromTx.points.length) return fromTx;
      if (query.data) {
        return seriesFromNamedTotals(
          query.data.current.byCategory
            .filter((row) => row.category === metric)
            .map((row) => ({ name: row.category, value: row.total })),
          query.data.previous.byCategory
            .filter((row) => row.category === metric)
            .map((row) => ({ name: row.category, value: row.total }))
        );
      }
      return fromTx;
    }
    if (query.data) {
      return seriesFromNamedTotals(
        query.data.current.byCategory.map((row) => ({ name: row.category, value: row.total })),
        query.data.previous.byCategory.map((row) => ({ name: row.category, value: row.total }))
      );
    }
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      const name = tx.category || "Other";
      totals.set(name, (totals.get(name) ?? 0) + (tx.amount || 0));
    }
    return seriesFromNamedTotals([...totals.entries()].map(([name, value]) => ({ name, value })));
  }, [query.data, transactions, period, metric]);

  const setMetric = (value: string) => {
    setLocalMetric(value);
    onDrill?.(value === "all" ? "" : value);
  };

  return (
    <InsightAreaChart
      data={series.points}
      headline={series.currentTotal}
      changePct={series.changePct}
      loading={(loading || query.isPending) && !query.data && series.points.length === 0}
      metrics={[{ value: "all", label: "All categories" }, ...categories.map((name) => ({ value: name, label: name }))]}
      metric={metric}
      onMetricChange={setMetric}
      periods={INSIGHT_PERIOD_OPTIONS}
      period={period}
      onPeriodChange={(value) => setPeriod(Number(value) as InsightPeriodDays)}
      height={280}
      emptyLabel="No category spend in this window"
    />
  );
}

export function EmployeeSpendTrendChart({
  transactions = [],
  loading = false,
  portal = "admin",
  departments = [],
  drillKey = "",
  onDrill,
}: {
  transactions?: Transaction[];
  loading?: boolean;
  portal?: InsightPortal;
  departments?: string[];
  drillKey?: string;
  onDrill?: (key: string) => void;
}) {
  const [period, setPeriod] = useState<InsightPeriodDays>(30);
  const [department, setDepartment] = useState("All");
  const query = useInsightAnalytics(portal, period);

  const employees = useMemo(() => {
    const fromApi = query.data?.current.byEmployee.map((row) => row.employeeName) ?? [];
    if (fromApi.length) return uniqueSorted(fromApi);
    return uniqueSorted(transactions.map((tx) => tx.employeeName));
  }, [query.data, transactions]);

  const metric = employees.includes(drillKey) ? drillKey : "all";

  const series = useMemo(() => {
    if (metric !== "all") {
      return seriesFromTransactions(
        transactions.filter(
          (tx) => tx.employeeName === metric && (department === "All" || tx.department === department)
        ),
        period,
        insightAmount
      );
    }
    if (query.data) {
      return seriesFromNamedTotals(
        query.data.current.byEmployee.map((row) => ({ name: row.employeeName, value: row.total })),
        query.data.previous.byEmployee.map((row) => ({ name: row.employeeName, value: row.total }))
      );
    }
    const scoped = transactions.filter((tx) => department === "All" || tx.department === department);
    const totals = new Map<string, number>();
    for (const tx of scoped) {
      totals.set(tx.employeeName, (totals.get(tx.employeeName) ?? 0) + (tx.amount || 0));
    }
    return seriesFromNamedTotals([...totals.entries()].map(([name, value]) => ({ name, value })));
  }, [query.data, transactions, period, metric, department]);

  return (
    <InsightAreaChart
      data={series.points}
      headline={series.currentTotal}
      changePct={series.changePct}
      loading={(loading || query.isPending) && !query.data && series.points.length === 0}
      metrics={[{ value: "all", label: "All employees" }, ...employees.map((name) => ({ value: name, label: name }))]}
      metric={metric}
      onMetricChange={(value) => onDrill?.(value === "all" ? "" : value)}
      periods={INSIGHT_PERIOD_OPTIONS}
      period={period}
      onPeriodChange={(value) => setPeriod(Number(value) as InsightPeriodDays)}
      height={280}
      emptyLabel="No employee spend in this window"
      headerExtra={
        departments.length > 1 ? (
          <PillSelect
            value={department}
            options={[
              { value: "All", label: "All departments" },
              ...departments.map((dept) => ({ value: dept, label: dept })),
            ]}
            onChange={setDepartment}
            minWidth={150}
          />
        ) : null
      }
    />
  );
}
