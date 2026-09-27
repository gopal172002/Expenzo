import dayjs from "dayjs";
import type { AggregatedAnalyticsResponse } from "../api/adminApi";
import type { Transaction } from "../types";

export type InsightPeriodDays = 7 | 30 | 90 | 365;

export const INSIGHT_PERIOD_OPTIONS: { value: InsightPeriodDays; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last 12 months" },
];

export type InsightPoint = {
  id: string;
  label: string;
  tooltip: string;
  value: number;
  previous?: number;
  trend?: number;
};

export type InsightSeries = {
  points: InsightPoint[];
  currentTotal: number;
  previousTotal: number;
  changePct: number | null;
};

export type InsightValueFn = (tx: Transaction) => number;

export const insightAmount: InsightValueFn = (tx) => Number(tx.amount) || 0;
export const insightApproved: InsightValueFn = (tx) => (tx.status === "approved" ? Number(tx.amount) || 0 : 0);
export const insightPending: InsightValueFn = (tx) => (tx.status === "pending" ? Number(tx.amount) || 0 : 0);
export const insightClaims: InsightValueFn = () => 1;

export function insightBucket(days: number): "daily" | "weekly" | "monthly" {
  if (days > 180) return "monthly";
  if (days > 60) return "weekly";
  return "daily";
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function movingAverage(values: number[], window = 3) {
  return values.map((_, index) => {
    const from = Math.max(0, index - Math.floor(window / 2));
    const to = Math.min(values.length, index + Math.ceil(window / 2));
    const slice = values.slice(from, to);
    const avg = slice.reduce((sum, value) => sum + value, 0) / (slice.length || 1);
    return Math.round(avg * 100) / 100;
  });
}

function finishSeries(points: InsightPoint[]): InsightSeries {
  const values = points.map((point) => point.value);
  const trends = movingAverage(values, points.length > 20 ? 5 : 3);
  const withTrend = points.map((point, index) => ({ ...point, trend: trends[index] }));
  const currentTotal = withTrend.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = withTrend.reduce((sum, point) => sum + (point.previous ?? 0), 0);
  return {
    points: withTrend,
    currentTotal: Math.round(currentTotal * 100) / 100,
    previousTotal: Math.round(previousTotal * 100) / 100,
    changePct: changePercent(currentTotal, previousTotal),
  };
}

function formatPeriodLabel(period: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return dayjs(period).format("MMM D");
  if (/^\d{4}-\d{2}$/.test(period)) return dayjs(`${period}-01`).format("MMM YYYY");
  return period;
}

function formatPeriodTooltip(period: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return dayjs(period).format("ddd, DD MMM YYYY");
  if (/^\d{4}-\d{2}$/.test(period)) return dayjs(`${period}-01`).format("MMMM YYYY");
  return period;
}

export function seriesFromTimeline(
  current: AggregatedAnalyticsResponse["timeline"] = [],
  previous: AggregatedAnalyticsResponse["timeline"] = [],
  metric: "spend" | "claims" = "spend"
): InsightSeries {
  const pick = (row: { total: number; count: number }) => (metric === "claims" ? row.count : row.total);
  const currentRows = current.filter((row) => pick(row) > 0);
  const previousRows = previous.filter((row) => pick(row) > 0);
  const points = currentRows.map((row, index) => ({
    id: row.period,
    label: formatPeriodLabel(row.period),
    tooltip: formatPeriodTooltip(row.period),
    value: Math.round(pick(row) * 100) / 100,
    previous: previousRows[index] != null ? Math.round(pick(previousRows[index]!) * 100) / 100 : 0,
  }));
  return finishSeries(points);
}

export function seriesFromNamedTotals(
  current: { name: string; value: number }[],
  previous: { name: string; value: number }[] = []
): InsightSeries {
  const prevMap = new Map(previous.map((row) => [row.name, row.value]));
  const points = current
    .filter((row) => row.name && row.value > 0)
    .map((row) => ({
      id: row.name,
      label: row.name,
      tooltip: row.name,
      value: Math.round(row.value * 100) / 100,
      previous: prevMap.get(row.name) ?? 0,
    }));
  return finishSeries(points);
}

function dayKey(value: string | dayjs.Dayjs) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

/** Only days that actually have spend — never a padded empty calendar. */
export function seriesFromTransactions(
  transactions: Transaction[],
  days: number,
  pick: InsightValueFn = insightAmount
): InsightSeries {
  const end = dayjs().endOf("day");
  const start = end.subtract(Math.max(days, 1) - 1, "day").startOf("day");
  const prevEnd = start.subtract(1, "day").endOf("day");
  const prevStart = prevEnd.subtract(Math.max(days, 1) - 1, "day").startOf("day");

  const current = new Map<string, number>();
  const previous = new Map<string, number>();

  for (const tx of transactions) {
    const key = dayKey(tx.dateTime);
    if (!key) continue;
    const at = dayjs(tx.dateTime);
    const amount = pick(tx);
    if (!amount) continue;
    if (!at.isBefore(start) && !at.isAfter(end)) {
      current.set(key, (current.get(key) ?? 0) + amount);
    } else if (!at.isBefore(prevStart) && !at.isAfter(prevEnd)) {
      previous.set(key, (previous.get(key) ?? 0) + amount);
    }
  }

  const currentDays = [...current.keys()].sort();
  const previousDays = [...previous.keys()].sort();
  const points = currentDays.map((key, index) => ({
    id: key,
    label: dayjs(key).format("MMM D"),
    tooltip: dayjs(key).format("ddd, DD MMM YYYY"),
    value: Math.round((current.get(key) ?? 0) * 100) / 100,
    previous: previous.get(previousDays[index] ?? "") ?? 0,
  }));

  return finishSeries(points);
}

export function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function filterByCategory(transactions: Transaction[], category: string) {
  if (!category || category === "all") return transactions;
  return transactions.filter((tx) => tx.category === category);
}

export function filterByEmployee(transactions: Transaction[], employeeName: string) {
  if (!employeeName || employeeName === "all") return transactions;
  return transactions.filter((tx) => tx.employeeName === employeeName);
}

export function filterByDepartment(transactions: Transaction[], department: string) {
  if (!department || department === "All") return transactions;
  return transactions.filter((tx) => tx.department === department);
}

export function windowRange(days: number) {
  const end = dayjs().endOf("day");
  const start = end.subtract(Math.max(days, 1) - 1, "day").startOf("day");
  const prevEnd = start.subtract(1, "day").endOf("day");
  const prevStart = prevEnd.subtract(Math.max(days, 1) - 1, "day").startOf("day");
  return {
    start: start.format("YYYY-MM-DD"),
    end: end.format("YYYY-MM-DD"),
    prevStart: prevStart.format("YYYY-MM-DD"),
    prevEnd: prevEnd.format("YYYY-MM-DD"),
    bucket: insightBucket(days),
  };
}
