import type { ITransaction } from "../models";
import { isPaymentCaptured, type PaymentStatus } from "./razorpayConfig";

/** Payment fields the server owns — mobile sync must not overwrite. */
const SERVER_OWNED_PAYMENT_FIELDS = [
  "paymentStatus",
  "razorpayOrderId",
  "razorpayPaymentId",
  "orderAmountPaise",
  "capturedAmountPaise",
  "paymentMethod",
  "paymentFailedReason",
  "paymentConfirmedAt",
  "razorpayWebhookEventIds",
  "paymentId",
  "amountPaise",
  "upiTxnRef",
  "approvalRefNo",
  "upiResponseCode",
  "expenseSource",
] as const;

function stripServerOwnedPaymentFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...fields };
  for (const key of SERVER_OWNED_PAYMENT_FIELDS) {
    delete next[key];
  }
  return next;
}

export function mergeMobileSyncFields(
  existing: ITransaction,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const safe = stripServerOwnedPaymentFields(incoming);

  if (
    existing.paymentStatus === "payment_captured" ||
    existing.paymentStatus === "SUCCESS_REPORTED"
  ) {
    safe.hasMatchingAllpayRecord = existing.hasMatchingAllpayRecord;
    safe.upiRefId = existing.upiRefId;
  }

  return safe;
}

export function canSubmitReimbursement(paymentStatus: PaymentStatus | string | undefined): boolean {
  return (
    isPaymentCaptured(paymentStatus as PaymentStatus | undefined) ||
    paymentStatus === "SUCCESS_REPORTED" ||
    paymentStatus === "USER_CONFIRMED"
  );
}

export function reimbursementBlockedMessage(paymentStatus: PaymentStatus | string | undefined): string {
  if (canSubmitReimbursement(paymentStatus)) {
    return "";
  }
  return "Payment must be captured before submitting for reimbursement";
}
