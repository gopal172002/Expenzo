import dayjs from "dayjs";
import { ITransaction, Transaction } from "../models";
import { assertMerchantPayee } from "./merchantPayee";
import {
  assertValidPaymentStatus,
  loadRazorpayConfig,
  requireRazorpaySecrets,
  type PaymentStatus,
} from "./razorpayConfig";

export type CreatePayoutInput = {
  amountPaise: number;
  vpa: string;
  merchantName: string;
  referenceId: string;
};

export type PayoutResult = {
  id: string;
  status: string;
  utr?: string;
};

export type PayoutApi = {
  createVpaPayout: (input: CreatePayoutInput) => Promise<PayoutResult>;
  fetchPayout?: (payoutId: string) => Promise<PayoutResult>;
  refundPayment: (paymentId: string, amountPaise: number) => Promise<{ id: string }>;
};

let payoutApiOverride: Partial<PayoutApi> | null = null;

export function setPayoutApiForTests(api: Partial<PayoutApi> | null): void {
  payoutApiOverride = api;
}

function appendTimeline(tx: ITransaction, action: string): void {
  tx.timeline.push({
    id: `payout-${Date.now().toString(36)}`,
    actor: "RazorpayX",
    action,
    timestamp: dayjs().toISOString(),
  });
}

function markPayoutProcessed(tx: ITransaction, payoutId: string, utr?: string): void {
  tx.paymentStatus = assertValidPaymentStatus("payout_processed");
  tx.razorpayPayoutId = payoutId;
  if (utr) {
    tx.payoutUtr = utr;
    tx.upiRefId = utr;
  }
  tx.payoutProcessedAt = dayjs().toISOString();
  tx.hasMatchingAllpayRecord = true;
  tx.paymentConfirmedAt = tx.paymentConfirmedAt ?? dayjs().toISOString();
  tx.expenseSource = "ALLPAY_MERCHANT_PAYOUT";
  appendTimeline(tx, utr ? `Shop paid · UTR ${utr}` : "Shop payout processed");
}

async function defaultCreateVpaPayout(input: CreatePayoutInput): Promise<PayoutResult> {
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);
  if (!config.accountNumber) {
    throw new Error("RAZORPAYX_ACCOUNT_NUMBER is not configured");
  }

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "X-Payout-Idempotency": input.referenceId.slice(0, 64),
    },
    body: JSON.stringify({
      account_number: config.accountNumber,
      amount: input.amountPaise,
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: false,
      reference_id: input.referenceId.slice(0, 40),
      narration: `AllPay ${input.merchantName}`.replace(/[^\w\s]/g, "").slice(0, 30),
      fund_account: {
        account_type: "vpa",
        vpa: { address: input.vpa },
        contact: {
          name: input.merchantName.slice(0, 50) || "Merchant",
          type: "vendor",
        },
      },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    utr?: string;
    error?: { description?: string };
    description?: string;
  };

  if (!res.ok || !body.id) {
    throw new Error(
      body.error?.description || body.description || `RazorpayX payout failed (${res.status})`
    );
  }

  return {
    id: String(body.id),
    status: String(body.status ?? "processing"),
    ...(body.utr ? { utr: String(body.utr) } : {}),
  };
}

async function defaultRefundPayment(
  paymentId: string,
  amountPaise: number
): Promise<{ id: string }> {
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { description?: string };
  };
  if (!res.ok || !body.id) {
    throw new Error(body.error?.description || `Razorpay refund failed (${res.status})`);
  }
  return { id: String(body.id) };
}

async function defaultFetchPayout(payoutId: string): Promise<PayoutResult> {
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payouts/${encodeURIComponent(payoutId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    utr?: string;
    error?: { description?: string };
  };
  if (!res.ok || !body.id) {
    throw new Error(body.error?.description || `Could not read payout ${payoutId}`);
  }
  return {
    id: String(body.id),
    status: String(body.status ?? "processing"),
    ...(body.utr ? { utr: String(body.utr) } : {}),
  };
}

async function createVpaPayout(input: CreatePayoutInput): Promise<PayoutResult> {
  if (payoutApiOverride?.createVpaPayout) {
    return payoutApiOverride.createVpaPayout(input);
  }
  return defaultCreateVpaPayout(input);
}

async function fetchPayout(payoutId: string): Promise<PayoutResult> {
  if (payoutApiOverride?.fetchPayout) {
    return payoutApiOverride.fetchPayout(payoutId);
  }
  return defaultFetchPayout(payoutId);
}

async function refundPayment(paymentId: string, amountPaise: number): Promise<{ id: string }> {
  if (payoutApiOverride?.refundPayment) {
    return payoutApiOverride.refundPayment(paymentId, amountPaise);
  }
  return defaultRefundPayment(paymentId, amountPaise);
}

export async function refundCapturedPayment(tx: ITransaction, reason: string): Promise<void> {
  if (tx.refundId || tx.paymentStatus === "refunded") {
    return;
  }
  if (!tx.razorpayPaymentId) {
    tx.paymentStatus = assertValidPaymentStatus("payout_failed");
    tx.payoutFailedReason = reason;
    appendTimeline(tx, `Payout failed · ${reason}`);
    await tx.save();
    return;
  }

  tx.paymentStatus = assertValidPaymentStatus("refund_initiated");
  tx.payoutFailedReason = reason;
  appendTimeline(tx, `Refunding employee · ${reason}`);
  await tx.save();

  try {
    const amountPaise = tx.capturedAmountPaise ?? tx.orderAmountPaise ?? Math.round(tx.amount * 100);
    const refund = await refundPayment(tx.razorpayPaymentId, amountPaise);
    tx.refundId = refund.id;
    tx.paymentStatus = assertValidPaymentStatus("refunded");
    tx.hasMatchingAllpayRecord = false;
    appendTimeline(tx, `Employee refunded · ${refund.id}`);
  } catch (error) {
    tx.paymentStatus = assertValidPaymentStatus("payout_failed");
    tx.payoutFailedReason = `${reason}; refund failed: ${(error as Error).message}`;
    appendTimeline(tx, `Refund failed · ${(error as Error).message}`);
  }
  await tx.save();
}

/** Pay the scanned shop after the employee’s Razorpay collect is captured. Idempotent. */
export async function settleMerchantPayout(txId: string): Promise<ITransaction | null> {
  const tx = await Transaction.findOne({ id: txId }).exec();
  if (!tx) {
    return null;
  }

  const status = tx.paymentStatus as PaymentStatus | undefined;
  if (status === "payout_processed" || status === "refunded" || status === "refund_initiated") {
    return tx;
  }

  const config = loadRazorpayConfig();
  if (status === "payout_initiated" && tx.razorpayPayoutId && config.accountNumber) {
    try {
      const latest = await fetchPayout(tx.razorpayPayoutId);
      if (latest.status === "processed" || latest.status === "processed_manually") {
        markPayoutProcessed(tx, latest.id, latest.utr);
        await tx.save();
        return tx;
      }
      if (
        latest.status === "rejected" ||
        latest.status === "reversed" ||
        latest.status === "failed" ||
        latest.status === "cancelled"
      ) {
        await refundCapturedPayment(tx, `Payout ${latest.status}`);
        return Transaction.findOne({ id: txId }).exec();
      }
    } catch {
      return tx;
    }
    return tx;
  }
  if (status === "payout_initiated" && tx.razorpayPayoutId) {
    return tx;
  }
  if (status !== "payment_captured" && status !== "payout_failed" && status !== "payment_processing") {
    return tx;
  }

  if (!config.accountNumber) {
    const alreadySkipped = tx.timeline.some((item) =>
      String(item.action).includes("Shop payout skipped")
    );
    tx.paymentStatus = assertValidPaymentStatus("payment_captured");
    tx.hasMatchingAllpayRecord = true;
    tx.paymentConfirmedAt = tx.paymentConfirmedAt ?? dayjs().toISOString();
    if (!alreadySkipped) {
      appendTimeline(tx, "Shop payout skipped — add RAZORPAYX_ACCOUNT_NUMBER to pay the shop");
    }
    await tx.save();
    return tx;
  }

  try {
    const payee = assertMerchantPayee({ vpa: tx.merchantVpa, mcc: tx.mcc });
    const amountPaise = tx.capturedAmountPaise ?? tx.orderAmountPaise ?? Math.round(tx.amount * 100);
    const payout = await createVpaPayout({
      amountPaise,
      vpa: payee.vpa,
      merchantName: tx.merchantName,
      referenceId: tx.id,
    });

    tx.razorpayPayoutId = payout.id;
    if (payout.status === "processed" || payout.status === "processed_manually") {
      markPayoutProcessed(tx, payout.id, payout.utr);
    } else {
      tx.paymentStatus = assertValidPaymentStatus("payout_initiated");
      appendTimeline(tx, `Shop payout started · ${payout.id}`);
    }
    await tx.save();
    return tx;
  } catch (error) {
    await refundCapturedPayment(tx, (error as Error).message);
    return Transaction.findOne({ id: txId }).exec();
  }
}

export function applyPayoutWebhookToTransaction(
  tx: ITransaction,
  event: string,
  payout: { id?: string; status?: string; utr?: string; reference_id?: string }
): boolean {
  const payoutId = payout.id ? String(payout.id) : tx.razorpayPayoutId;
  if (payoutId) {
    tx.razorpayPayoutId = payoutId;
  }

  if (event === "payout.processed" || payout.status === "processed") {
    if (tx.paymentStatus === "refunded" || tx.paymentStatus === "refund_initiated") {
      return false;
    }
    markPayoutProcessed(tx, payoutId || tx.id, payout.utr);
    return true;
  }

  if (
    event === "payout.rejected" ||
    event === "payout.reversed" ||
    event === "payout.failed" ||
    payout.status === "rejected" ||
    payout.status === "reversed" ||
    payout.status === "failed" ||
    payout.status === "cancelled"
  ) {
    if (tx.paymentStatus === "payout_processed" || tx.paymentStatus === "refunded") {
      return false;
    }
    tx.paymentStatus = assertValidPaymentStatus("payout_failed");
    tx.payoutFailedReason = `Payout ${payout.status || event}`;
    appendTimeline(tx, `Shop payout failed · ${payout.status || event}`);
    return true;
  }

  if (event === "payout.initiated" || event === "payout.queued" || event === "payout.pending") {
    if (tx.paymentStatus !== "payout_processed") {
      tx.paymentStatus = assertValidPaymentStatus("payout_initiated");
      appendTimeline(tx, `Webhook: ${event}`);
      return true;
    }
  }

  return false;
}
