import dayjs from "dayjs";
import type { Transaction } from "../types";

export type AnalyticsPeriod = "day" | "week" | "month" | "year";

export const ANALYTICS_PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function getPeriodRange(period: AnalyticsPeriod) {
  const end = dayjs().endOf("day");
  switch (period) {
    case "day":
      return { start: end.startOf("day"), end };
    case "week":
      return { start: end.startOf("week"), end };
    case "month":
      return { start: end.startOf("month"), end };
    case "year":
      return { start: end.startOf("year"), end };
  }
}

export function filterTransactionsInPeriod(transactions: Transaction[], period: AnalyticsPeriod) {
  const { start, end } = getPeriodRange(period);
  return transactions.filter((tx) => {
    const d = dayjs(tx.dateTime);
    return !d.isBefore(start) && !d.isAfter(end);
  });
}

export type EmployeeSpendChartPoint = {
  name: string;
  value: number;
  byCategory: { category: string; total: number }[];
};

export function aggregateByEmployee(transactions: Transaction[]): EmployeeSpendChartPoint[] {
  const map = new Map<string, { name: string; total: number; cats: Map<string, number> }>();
  for (const tx of transactions) {
    const entry = map.get(tx.employeeId) || { name: tx.employeeName, total: 0, cats: new Map<string, number>() };
    entry.total += tx.amount;
    entry.name = tx.employeeName;
    const cat = tx.category?.trim() || "Other";
    entry.cats.set(cat, (entry.cats.get(cat) || 0) + tx.amount);
    map.set(tx.employeeId, entry);
  }
  return [...map.values()]
    .map((v) => ({
      name: v.name,
      value: Math.round(v.total * 100) / 100,
      byCategory: [...v.cats.entries()]
        .map(([category, total]) => ({
          category,
          total: Math.round(total * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function formatRupeeAxis(value: number) {
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
}
