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

export function paymentStatusLabel(status?: string): string {
  switch (status) {
    case "payout_processed":
      return "Shop paid";
    case "payout_initiated":
      return "Paying shop";
    case "payout_failed":
      return "Shop payout failed";
    case "payment_captured":
      return "Received by AllPay";
    case "payment_processing":
      return "Confirming capture";
    case "order_created":
      return "Order created — not paid";
    case "checkout_opened":
      return "Checkout opened — not confirmed";
    case "payment_failed":
      return "Employee payment failed";
    case "payment_abandoned":
      return "Checkout closed";
    case "refund_initiated":
      return "Refund started";
    case "refunded":
      return "Refunded to employee";
    default:
      return status || "—";
  }
}

export function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function inrAxis(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString("en-IN");
}
