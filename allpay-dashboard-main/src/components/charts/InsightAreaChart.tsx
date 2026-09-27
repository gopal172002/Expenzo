import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import NorthEast from "@mui/icons-material/NorthEast";
import SouthEast from "@mui/icons-material/SouthEast";
import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inr } from "../../utils/labels";
import type { InsightPoint } from "../../utils/insightSeries";

export type InsightChartStyle = "classic" | "dither";

export type InsightMetricOption = { value: string; label: string };
export type InsightPeriodOption = { value: string | number; label: string };

const LINE = "#3B5BDB";
const PREV = "#C5C9D4";
const TREND = "#7C3AED";
const TICK = "#9CA3AF";
const CARD_BORDER = "#ECEEF2";

function formatAxis(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

export function PillSelect<T extends string | number>({
  value,
  options,
  onChange,
  leadingDot,
  minWidth = 148,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  leadingDot?: boolean;
  minWidth?: number;
}) {
  return (
    <FormControl size="small">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        IconComponent={KeyboardArrowDown}
        renderValue={(selected) => {
          const label = options.find((opt) => opt.value === selected)?.label ?? String(selected);
          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              {leadingDot ? (
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: LINE, flexShrink: 0 }} />
              ) : null}
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1 }}>
                {label}
              </Typography>
            </Stack>
          );
        }}
        sx={{
          minWidth,
          height: 36,
          borderRadius: 999,
          bgcolor: "#fff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E5E7EB" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: LINE },
          "& .MuiSelect-select": { py: 0.75, pr: "32px !important", display: "flex", alignItems: "center" },
          "& .MuiSelect-icon": { color: "#6B7280", fontSize: 20 },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: 0.75,
              borderRadius: 2,
              border: "1px solid #E5E7EB",
              boxShadow: "0 12px 32px rgba(15,23,42,0.10)",
            },
          },
        }}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value} sx={{ fontSize: 13, fontWeight: 600 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function InsightTooltip({
  active,
  payload,
  compare,
  trendView,
}: {
  active?: boolean;
  payload?: Array<{ payload?: InsightPoint }>;
  compare: boolean;
  trendView: boolean;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const point = payload[0].payload;
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 2,
        px: 1.5,
        py: 1.1,
        minWidth: 148,
        boxShadow: "0 10px 28px rgba(15,23,42,0.10)",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 600, mb: 0.35 }}>
        {point.tooltip || point.label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 750, color: "#111827" }}>{inr(point.value)}</Typography>
      {compare && point.previous != null ? (
        <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.35 }}>
          Previous: {inr(point.previous)}
        </Typography>
      ) : null}
      {trendView && point.trend != null ? (
        <Typography sx={{ fontSize: 12, color: TREND, mt: 0.25 }}>Trend: {inr(point.trend)}</Typography>
      ) : null}
    </Box>
  );
}

export function InsightAreaChart({
  data,
  headline,
  changePct,
  loading = false,
  emptyLabel = "No data in this window",
  metrics,
  metric,
  onMetricChange,
  periods,
  period,
  onPeriodChange,
  height = 280,
  hideCompare = false,
  hideTrend = false,
  hideStyle = false,
  defaultCompare = true,
  defaultTrend = false,
  defaultStyle = "classic",
  headerExtra,
}: {
  data: InsightPoint[];
  headline?: number;
  changePct?: number | null;
  loading?: boolean;
  emptyLabel?: string;
  metrics?: InsightMetricOption[];
  metric?: string;
  onMetricChange?: (value: string) => void;
  periods?: InsightPeriodOption[];
  period?: string | number;
  onPeriodChange?: (value: string | number) => void;
  height?: number;
  hideCompare?: boolean;
  hideTrend?: boolean;
  hideStyle?: boolean;
  defaultCompare?: boolean;
  defaultTrend?: boolean;
  defaultStyle?: InsightChartStyle;
  headerExtra?: ReactNode;
}) {
  const reactId = useId().replace(/:/g, "");
  const fillId = `insight-fill-${reactId}`;
  const ditherId = `insight-dither-${reactId}`;
  const [compare, setCompare] = useState(defaultCompare);
  const [trendView, setTrendView] = useState(defaultTrend);
  const [chartStyle, setChartStyle] = useState<InsightChartStyle>(defaultStyle);

  const total = useMemo(
    () => headline ?? data.reduce((sum, point) => sum + point.value, 0),
    [data, headline]
  );
  const canCompare = data.some((point) => (point.previous ?? 0) > 0);
  const showCompare = compare && canCompare && !hideCompare;
  const lineType = trendView ? "monotone" : "linear";
  const yMax = useMemo(() => {
    const values = data.flatMap((point) =>
      showCompare ? [point.value, point.previous ?? 0] : [point.value]
    );
    const max = Math.max(0, ...values);
    return max === 0 ? 1 : max * 1.15;
  }, [data, showCompare]);
  const showDots = data.length > 0 && data.length <= 14;

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        minWidth: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.25} flexWrap="wrap" useFlexGap>
          <Typography
            sx={{
              fontSize: { xs: 26, md: 32 },
              fontWeight: 750,
              letterSpacing: "-0.03em",
              color: "#111827",
              lineHeight: 1.1,
            }}
          >
            {loading ? "—" : inr(total)}
          </Typography>
          {changePct != null && !loading ? (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              {changePct >= 0 ? (
                <NorthEast sx={{ fontSize: 14, color: "#16A34A" }} />
              ) : (
                <SouthEast sx={{ fontSize: 14, color: "#DC2626" }} />
              )}
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 650,
                  color: changePct >= 0 ? "#16A34A" : "#DC2626",
                }}
              >
                {changePct >= 0 ? "+" : ""}
                {changePct}%
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#9CA3AF" }}>vs. previous period</Typography>
            </Stack>
          ) : null}
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent="flex-end"
          sx={{ ml: { sm: "auto" } }}
        >
          {periods && period != null && onPeriodChange ? (
            <PillSelect value={period} options={periods} onChange={onPeriodChange} minWidth={150} />
          ) : null}
          {metrics && metric != null && onMetricChange ? (
            <PillSelect
              value={metric}
              options={metrics}
              onChange={onMetricChange}
              leadingDot
              minWidth={136}
            />
          ) : null}
          {headerExtra}
        </Stack>
      </Stack>

      {loading ? (
        <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ height }}>
          <CircularProgress size={26} thickness={4} sx={{ color: LINE }} />
          <Typography sx={{ fontSize: 13, color: TICK, fontWeight: 650 }}>Loading chart…</Typography>
        </Stack>
      ) : data.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" sx={{ height }}>
          <Typography sx={{ fontSize: 13, color: TICK, fontWeight: 650 }}>{emptyLabel}</Typography>
        </Stack>
      ) : (
        <Box sx={{ height, width: "100%", minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B93F8" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="#C7CDFB" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#F4F6FF" stopOpacity={0.04} />
                </linearGradient>
                <pattern id={ditherId} width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill="#EEF1FF" />
                  <circle cx="1.4" cy="1.4" r="1.05" fill="#7C86F5" fillOpacity="0.7" />
                  <circle cx="4.6" cy="4.6" r="0.85" fill="#6366F1" fillOpacity="0.45" />
                </pattern>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={[0, yMax]}
                tickFormatter={formatAxis}
              />
              <Tooltip
                content={<InsightTooltip compare={showCompare} trendView={trendView} />}
                cursor={{ stroke: "#E5E7EB", strokeDasharray: "4 4" }}
              />
              {showCompare ? (
                <Area
                  type={lineType}
                  dataKey="previous"
                  stroke={PREV}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  fill="none"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
              <Area
                type={lineType}
                dataKey="value"
                stroke={LINE}
                strokeWidth={2}
                fill={chartStyle === "dither" ? `url(#${ditherId})` : `url(#${fillId})`}
                fillOpacity={1}
                dot={showDots ? { r: 3, fill: LINE, stroke: "#fff", strokeWidth: 1.5 } : false}
                activeDot={{ r: 5, fill: LINE, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
              {trendView ? (
                <Area
                  type="monotone"
                  dataKey="trend"
                  stroke={TREND}
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.25}
        sx={{ mt: 1.25 }}
      >
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
          {!hideCompare ? (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Switch
                size="small"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#111827" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#111827" },
                }}
              />
              <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 550 }}>
                Compare previous period
              </Typography>
            </Stack>
          ) : null}
          {!hideTrend ? (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Switch
                size="small"
                checked={trendView}
                onChange={(e) => setTrendView(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#111827" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#111827" },
                }}
              />
              <Typography sx={{ fontSize: 13, color: "#6B7280", fontWeight: 550 }}>Trend view</Typography>
            </Stack>
          ) : null}
        </Stack>

        {!hideStyle ? (
          <PillSelect
            value={chartStyle}
            options={[
              { value: "classic", label: "∼ Classic" },
              { value: "dither", label: "∼ Dither" },
            ]}
            onChange={setChartStyle}
            minWidth={122}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
