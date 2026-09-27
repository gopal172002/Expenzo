import { useMemo, useState } from "react";
import { seriesFromNamedTotals } from "../../utils/insightSeries";
import { InsightAreaChart } from "./InsightAreaChart";
import type { SpendBreakdownCategory } from "./SpendBreakdownTooltip";

export function EmployeeSpendBarChart({
  chartData,
  height = 300,
}: {
  chartData: {
    name: string;
    value: number;
    byCategory?: SpendBreakdownCategory[];
  }[];
  onBarClick?: (name: string) => void;
  height?: number;
  autoYAxis?: boolean;
  showCategoryBreakdown?: boolean;
  layout?: "vertical" | "horizontal";
  highlightName?: string;
  showSummary?: boolean;
}) {
  const [metric, setMetric] = useState("all");

  const metrics = useMemo(
    () => [{ value: "all", label: "All categories" }, ...chartData.map((row) => ({ value: row.name, label: row.name }))],
    [chartData]
  );

  const visible = useMemo(
    () => (metric === "all" ? chartData : chartData.filter((row) => row.name === metric)),
    [chartData, metric]
  );

  const points = useMemo(
    () => seriesFromNamedTotals(visible.map((row) => ({ name: row.name, value: row.value }))).points,
    [visible]
  );
  const total = useMemo(() => visible.reduce((sum, row) => sum + row.value, 0), [visible]);

  return (
    <InsightAreaChart
      data={points}
      headline={total}
      metrics={metrics}
      metric={metric}
      onMetricChange={setMetric}
      height={height}
      hideCompare
      emptyLabel="No spend in this filter"
    />
  );
}
