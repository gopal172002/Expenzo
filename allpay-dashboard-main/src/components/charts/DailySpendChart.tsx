import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Transaction } from "../../types";
import { inr, inrAxis } from "../../utils/labels";

export type SpendRange = "5D" | "1M" | "1Y" | "Max";

const RANGE_OPTIONS: SpendRange[] = ["5D", "1M", "1Y", "Max"];

function rangeStart(range: SpendRange, oldest: dayjs.Dayjs) {
  const now = dayjs();
  if (range === "5D") return now.subtract(4, "day").startOf("day");
  if (range === "1M") return now.subtract(29, "day").startOf("day");
  if (range === "1Y") return now.subtract(364, "day").startOf("day");
  return oldest.startOf("day");
}

function buildSeries(transactions: Transaction[], range: SpendRange) {
  const sorted = [...transactions].sort(
    (a, b) => dayjs(a.dateTime).valueOf() - dayjs(b.dateTime).valueOf()
  );
  const oldest = sorted[0] ? dayjs(sorted[0].dateTime) : dayjs().subtract(4, "day");
  const start = rangeStart(range, oldest);
  const inRange = sorted.filter((tx) => !dayjs(tx.dateTime).isBefore(start));

  const points: { ts: number; label: string; tooltip: string; value: number; daily: number }[] = [
    {
      ts: start.valueOf(),
      label: start.format("DD MMM"),
      tooltip: start.format("ddd DD MMM HH:mm"),
      value: 0,
      daily: 0,
    },
  ];

  let running = 0;
  const byDay = new Map<string, number>();
  for (const tx of inRange) {
    running += tx.amount;
    const at = dayjs(tx.dateTime);
    const dayKey = at.format("YYYY-MM-DD");
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + tx.amount);
    points.push({
      ts: at.valueOf(),
      label: at.format("DD MMM"),
      tooltip: at.format("ddd DD MMM HH:mm"),
      value: Math.round(running * 100) / 100,
      daily: Math.round((byDay.get(dayKey) ?? 0) * 100) / 100,
    });
  }

  const end = dayjs();
  if (points[points.length - 1]!.ts < end.valueOf()) {
    points.push({
      ts: end.valueOf(),
      label: end.format("DD MMM"),
      tooltip: end.format("ddd DD MMM HH:mm"),
      value: running,
      daily: byDay.get(end.format("YYYY-MM-DD")) ?? 0,
    });
  }
  return points;
}

export function DailySpendChart({
  transactions,
  loading = false,
}: {
  transactions: Transaction[];
  loading?: boolean;
}) {
  const [range, setRange] = useState<SpendRange>("5D");
  const [rangePending, startRangeTransition] = useTransition();
  const series = useMemo(() => buildSeries(transactions, range), [transactions, range]);
  const latest = series[series.length - 1]?.value ?? 0;
  const busy = loading || rangePending;

  return (
    <Box
      sx={{
        bgcolor: "#16181D",
        color: "#E5E7EB",
        borderRadius: 2,
        p: { xs: 2, md: 2.5 },
        border: "1px solid #22252C",
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} mb={2}>
        <Box>
          <Typography variant="caption" sx={{ color: "#9CA3AF", letterSpacing: 0.6, textTransform: "uppercase" }}>
            Spend over time
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 24, color: "#F9FAFB", mt: 0.25, letterSpacing: "-0.02em" }}>
            {busy ? "—" : inr(latest)}
          </Typography>
          <Typography variant="caption" sx={{ color: "#9CA3AF" }}>
            Cumulative claimed amount across the selected range
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: "#1F232B", p: 0.5, borderRadius: 999, alignSelf: "flex-start" }}>
          {RANGE_OPTIONS.map((option) => {
            const active = option === range;
            return (
              <Box
                key={option}
                component="button"
                disabled={busy}
                onClick={() => startRangeTransition(() => setRange(option))}
                sx={{
                  border: 0,
                  cursor: busy ? "wait" : "pointer",
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 650,
                  bgcolor: active ? "#2A2F38" : "transparent",
                  color: active ? "#F9FAFB" : "#9CA3AF",
                  opacity: busy && !active ? 0.6 : 1,
                }}
              >
                {option}
              </Box>
            );
          })}
        </Stack>
      </Stack>

      {busy ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.25}
          sx={{
            height: 280,
            bgcolor: "rgba(255,255,255,0.03)",
            borderRadius: 2,
            border: "1px dashed #2A2F38",
          }}
        >
          <CircularProgress size={28} thickness={4} sx={{ color: "#93C5FD" }} />
          <Typography variant="body2" sx={{ color: "#9CA3AF", fontWeight: 650 }}>
            Loading spend over time…
          </Typography>
        </Stack>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2A2F38" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value: number) => inrAxis(value)}
            />
            <Tooltip
              contentStyle={{
                background: "#1F232B",
                border: "1px solid #2A2F38",
                borderRadius: 8,
                color: "#F9FAFB",
                fontSize: 12,
              }}
              formatter={(value) => [inr(Number(value ?? 0)), "Cumulative"]}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.tooltip ?? "")}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4ADE80"
              strokeWidth={2}
              fill="url(#spendFill)"
              dot={false}
              activeDot={{ r: 4, fill: "#4ADE80", stroke: "#16181D", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
