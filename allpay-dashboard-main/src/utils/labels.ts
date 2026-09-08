import type { TransactionStatus } from "../types";

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  flagged: "Flagged",
};

export const STATUS_OPTIONS: { value: TransactionStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
];

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as TransactionStatus] ?? status;
}

export function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function inrAxis(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString("en-IN");
}
