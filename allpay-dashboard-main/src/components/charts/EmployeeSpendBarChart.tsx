import { Box, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeTightChartAxis } from "../../utils/chartAxis";
import { inr, inrAxis } from "../../utils/labels";
import { SpendBreakdownTooltip } from "./SpendBreakdownTooltip";
import type { SpendBreakdownCategory } from "./SpendBreakdownTooltip";

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name?: string; value?: number } }>;
  label?: string;
};

const MARK_MUTED = "rgba(74, 222, 128, 0.16)";
const FIXED_Y_AXIS = {
  domain: [0, 12000] as [number, number],
  ticks: [0, 3000, 6000, 9000, 12000],
};

/** Exact palette from Spend-over-time / reference swatch */
const CHART_BG = "#16181D";
const CHART_GRID = "#2A2F38";
const CHART_TICK = "#9CA3AF";
const CHART_LABEL = "#FFFFFF";
const CHART_GREEN = "#4ADE80";
const CHART_AXIS_LINE = "#EF4444";

type ChartRow = {
  name: string;
  value: number;
  byCategory?: SpendBreakdownCategory[];
  rank: number;
  shortName: string;
};

function truncateName(name: string, max = 16) {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function CategoryTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0];
  const value = Number(row.value ?? row.payload?.value ?? 0);
  const title = row.payload?.name ?? label ?? "";
  return (
    <Box
      sx={{
        bgcolor: "#0f172a",
        color: "#fff",
        px: 1.5,
        py: 1.15,
        borderRadius: 2,
        minWidth: 140,
        boxShadow: "0 8px 24px rgba(15,23,42,0.28)",
      }}
    >
      {title ? (
        <Typography variant="body2" fontWeight={650} sx={{ color: "#e2e8f0", mb: 0.25 }}>
          {title}
        </Typography>
      ) : null}
      <Typography variant="body2" fontWeight={750} sx={{ color: "#4ADE80" }}>
        {inr(value)}
      </Typography>
    </Box>
  );
}

function EndValueLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value } = props;
  const n = Number(value ?? 0);
  if (!n) return null;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      fill="#4ADE80"
      fontSize={11}
      fontWeight={700}
      dominantBaseline="middle"
    >
      {inr(n)}
    </text>
  );
}

function TopValueLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
}) {
  const { x = 0, y = 0, width = 0, value } = props;
  const n = Number(value ?? 0);
  if (!n) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="#4ADE80"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
    >
      {inr(n)}
    </text>
  );
}

function SummaryStrip({ rows }: { rows: ChartRow[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const avg = rows.length ? total / rows.length : 0;

  const items = [
    { label: "Total", value: inr(total) },
    { label: "Average", value: inr(avg) },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 1,
        mb: 1.75,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            px: 1.25,
            py: 1,
            borderRadius: 1.5,
            bgcolor: "#1F232B",
            border: "1px solid #2A2F38",
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 650, letterSpacing: "0.02em", color: "#9CA3AF" }}
          >
            {item.label}
          </Typography>
          <Typography
            fontWeight={750}
            sx={{ fontSize: 13.5, letterSpacing: "-0.01em", mt: 0.15, color: "#FFFFFF" }}
            noWrap
            title={item.value}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function EmployeeSpendBarChart({
  chartData,
  onBarClick,
  height = 360,
  autoYAxis = false,
  showCategoryBreakdown = false,
  highlightName,
  layout = "horizontal",
  showSummary = false,
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
  /** vertical = ranking bars (name on Y); horizontal = classic columns (name on X). */
  layout?: "vertical" | "horizontal";
  highlightName?: string;
  showSummary?: boolean;
}) {
  const sorted = useMemo<ChartRow[]>(
    () =>
      [...chartData]
        .sort((a, b) => b.value - a.value)
        .map((row, i) => ({
          ...row,
          rank: i + 1,
          shortName: truncateName(row.name, layout === "vertical" ? 18 : 12),
        })),
    [chartData, layout]
  );

  const values = sorted.map((d) => d.value);
  const valueAxis = autoYAxis ? computeTightChartAxis(values, 4) : FIXED_Y_AXIS;
  const isRank = layout === "vertical";
  const barSize = isRank
    ? sorted.length <= 3
      ? 36
      : sorted.length <= 8
        ? 28
        : 20
    : sorted.length <= 2
      ? 52
      : sorted.length <= 5
        ? 40
        : undefined;

  const chartHeight = isRank
    ? Math.max(height, 120 + sorted.length * 56)
    : height;

  if (sorted.length === 0) {
    return (
      <Box
        sx={{
          width: "100%",
          height,
          display: "grid",
          placeItems: "center",
          bgcolor: CHART_BG,
          border: "1px dashed #2A2F38",
          borderRadius: 2,
        }}
      >
        <Stack spacing={0.5} alignItems="center">
          <Typography variant="body2" fontWeight={650} sx={{ color: "#9CA3AF" }}>
            No employee spend in this filter
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>
            Try another department or period
          </Typography>
        </Stack>
      </Box>
    );
  }

  const fillFor = (row: ChartRow) => {
    if (highlightName) {
      return highlightName === row.name ? "url(#employeeSpendBarFill)" : MARK_MUTED;
    }
    return row.rank === 1 ? "url(#employeeSpendBarFill)" : "url(#employeeSpendBarFillSoft)";
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      {showSummary ? <SummaryStrip rows={sorted} /> : null}

      <Box
        sx={{
          width: "100%",
          height: chartHeight,
          minWidth: 0,
          bgcolor: "transparent",
          border: 0,
          borderRadius: 0,
          px: 0,
          py: 0,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {isRank ? (
            <BarChart
              layout="vertical"
              data={sorted}
              margin={{ top: 8, right: 72, left: 0, bottom: 32 }}
              barCategoryGap="18%"
            >
              <defs>
                <linearGradient id="employeeSpendBarFill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.06} />
                  <stop offset="45%" stopColor={CHART_GREEN} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.38} />
                </linearGradient>
                <linearGradient id="employeeSpendBarFillSoft" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.04} />
                  <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={false}
                vertical
                stroke={CHART_GRID}
                strokeDasharray="4 4"
                syncWithTicks
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: CHART_TICK }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE, strokeWidth: 1.5 }}
                domain={valueAxis.domain}
                ticks={valueAxis.ticks}
                tickFormatter={(v: number) => inrAxis(v)}
                allowDecimals={false}
                allowDataOverflow
                label={{
                  value: "Spend Amount",
                  position: "insideBottom",
                  offset: -22,
                  style: { fill: CHART_LABEL, fontSize: 12, fontWeight: 650 },
                }}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={118}
                tick={{ fontSize: 13, fill: CHART_LABEL, fontWeight: 650 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE, strokeWidth: 1.5 }}
                interval={0}
              />
              <Tooltip
                content={showCategoryBreakdown ? <SpendBreakdownTooltip /> : <CategoryTooltip />}
                cursor={{ fill: "rgba(74, 222, 128, 0.06)" }}
              />
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                barSize={barSize}
                maxBarSize={40}
                stroke={CHART_GREEN}
                strokeWidth={1.5}
                cursor={onBarClick ? "pointer" : "default"}
                onClick={
                  onBarClick ? (entry) => onBarClick((entry as { name: string }).name) : undefined
                }
              >
                {sorted.map((row) => (
                  <Cell key={row.name} fill={fillFor(row)} stroke={CHART_GREEN} />
                ))}
                <LabelList dataKey="value" content={<EndValueLabel />} />
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={sorted}
              margin={{ top: 28, right: 12, left: 4, bottom: 8 }}
              barCategoryGap={sorted.length <= 2 ? "42%" : "20%"}
              barGap={2}
            >
              <defs>
                <linearGradient id="employeeSpendColFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.38} />
                  <stop offset="55%" stopColor={CHART_GREEN} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="employeeSpendColFillSoft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                horizontal
                stroke={CHART_GRID}
                strokeDasharray="4 4"
                syncWithTicks
              />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 12, fill: CHART_LABEL, fontWeight: 650 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE, strokeWidth: 1.5 }}
                interval={0}
                height={44}
              />
              <YAxis
                type="number"
                orientation="left"
                tick={{ fontSize: 11, fill: CHART_TICK }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE, strokeWidth: 1.5 }}
                domain={valueAxis.domain}
                ticks={valueAxis.ticks}
                tickFormatter={(v: number) => inrAxis(v)}
                allowDecimals={false}
                allowDataOverflow
                width={52}
              />
              <Tooltip
                content={showCategoryBreakdown ? <SpendBreakdownTooltip /> : <CategoryTooltip />}
                cursor={{ fill: "rgba(74, 222, 128, 0.06)" }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                barSize={barSize}
                maxBarSize={56}
                stroke={CHART_GREEN}
                strokeWidth={1.5}
                cursor={onBarClick ? "pointer" : "default"}
                onClick={
                  onBarClick ? (entry) => onBarClick((entry as { name: string }).name) : undefined
                }
              >
                {sorted.map((row) => (
                  <Cell
                    key={row.name}
                    stroke={CHART_GREEN}
                    fill={
                      highlightName
                        ? highlightName === row.name
                          ? "url(#employeeSpendColFill)"
                          : MARK_MUTED
                        : row.rank === 1
                          ? "url(#employeeSpendColFill)"
                          : "url(#employeeSpendColFillSoft)"
                    }
                  />
                ))}
                <LabelList dataKey="value" content={<TopValueLabel />} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
