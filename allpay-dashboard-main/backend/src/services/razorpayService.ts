import crypto from "node:crypto";
import Razorpay from "razorpay";
import dayjs from "dayjs";
import { ITransaction, ProcessedWebhookEvent, Transaction } from "../models";
import {
  assertValidPaymentStatus,
  isShopPayoutEnabled,
  loadRazorpayConfig,
  requireRazorpaySecrets,
  type PaymentStatus,
} from "./razorpayConfig";
import { applyLocationToRecord } from "./paymentLocation";
import { assertMerchantPayee } from "./merchantPayee";
import {
  applyPayoutWebhookToTransaction,
  refundCapturedPayment,
  settleMerchantPayout,
} from "./razorpayPayoutService";

export type CreateOrderInput = {
  txId: string;
  amount: number;
  employeeId: string;
  companyId?: string;
  employeeName: string;
  department: string;
  merchant: {
    vpa: string;
    name: string;
    category: string;
    mcc: string;
    amount?: number;
  };
  upiApp?: string;
};

export type CreateOrderResult = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  txId: string;
  shopPayoutEnabled: boolean;
};

export type ConfirmPaymentInput = {
  txId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  location?: import("./paymentLocation").PaymentLocationSnapshot | null;
};

let razorpayClient: Razorpay | null = null;

export function resetRazorpayClientForTests(): void {
  razorpayClient = null;
}

function getRazorpayClient(): Razorpay {
  if (razorpayClient) {
    return razorpayClient;
  }
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);
  razorpayClient = new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
  return razorpayClient;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret?: string
): boolean {
  const secret = keySecret ?? loadRazorpayConfig().keySecret;
  if (!secret) {
    return false;
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

function verifyWebhookSignature(body: string, signature: string, webhookSecret?: string): boolean {
  const secret = webhookSecret ?? loadRazorpayConfig().webhookSecret;
  if (!secret) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

function appendTimeline(tx: ITransaction, action: string, actor = "Razorpay"): void {
  tx.timeline.push({
    id: `rzp-${Date.now().toString(36)}`,
    actor,
    action,
    timestamp: dayjs().toISOString(),
  });
}

function amountToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export async function createRazorpayOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);
  const payee = assertMerchantPayee({
    vpa: input.merchant.vpa,
    mcc: input.merchant.mcc,
  });

  if (input.merchant.amount !== undefined && input.merchant.amount > 0) {
    const qrPaise = amountToPaise(input.merchant.amount);
    const reqPaise = amountToPaise(input.amount);
    if (qrPaise !== reqPaise) {
      throw new Error("Amount must match the QR code amount");
    }
  }

  const amountPaise = amountToPaise(input.amount);
  if (amountPaise <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const existingQuery: Record<string, unknown> = { id: input.txId };
  if (input.companyId) existingQuery.companyId = input.companyId;
  const existing = await Transaction.findOne(existingQuery).exec();
  if (existing?.razorpayOrderId && existing.orderAmountPaise === amountPaise) {
    return {
      orderId: existing.razorpayOrderId,
      amount: amountPaise,
      currency: "INR",
      keyId: config.keyId,
      txId: input.txId,
      shopPayoutEnabled: isShopPayoutEnabled(config),
    };
  }
  if (existing?.razorpayOrderId && existing.orderAmountPaise !== amountPaise) {
    const err = new Error("Transaction amount changed; create a new transaction id");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const client = getRazorpayClient();
  const order = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: input.txId,
    notes: {
      employeeId: input.employeeId,
      ...(input.companyId ? { companyId: input.companyId } : {}),
      merchantVpa: payee.vpa,
      merchantName: input.merchant.name,
    },
  });

  const orderId = String(order.id);
  const fields = {
    id: input.txId,
    employeeId: input.employeeId,
    ...(input.companyId ? { companyId: input.companyId } : {}),
    employeeName: input.employeeName,
    department: input.department,
    merchantName: input.merchant.name || "Unknown",
    mcc: payee.mcc,
    category: input.merchant.category || "office",
    amount: input.amount,
    claimedAmount: input.amount,
    dateTime: dayjs().toISOString(),
    status: "pending",
    upiApp: input.upiApp ?? "Razorpay",
    upiRefId: "PENDING",
    isNewTx: true,
    flags: [],
    hasMatchingAllpayRecord: false,
    purposeCategory: input.merchant.category || "General",
    merchantVpa: payee.vpa,
    paymentStatus: "order_created" as PaymentStatus,
    razorpayOrderId: orderId,
    orderAmountPaise: amountPaise,
    paymentMethod: "razorpay_merchant_payout",
    expenseSource: "ALLPAY_MERCHANT_PAYOUT",
  };

  if (existing) {
    Object.assign(existing, fields);
    appendTimeline(existing, "Razorpay order created");
    await existing.save();
  } else {
    const created = new Transaction({
      ...fields,
      timeline: [
        {
          id: `rzp-${Date.now().toString(36)}`,
          actor: "Razorpay",
          action: "Razorpay order created",
          timestamp: dayjs().toISOString(),
        },
      ],
    });
    await created.save();
  }

  return {
    orderId,
    amount: amountPaise,
    currency: "INR",
    keyId: config.keyId,
    txId: input.txId,
    shopPayoutEnabled: isShopPayoutEnabled(config),
  };
}

export async function confirmRazorpayPayment(input: ConfirmPaymentInput): Promise<ITransaction> {
  const config = loadRazorpayConfig();
  requireRazorpaySecrets(config);

  const tx = await Transaction.findOne({ id: input.txId }).exec();
  if (!tx) {
    const err = new Error("Transaction not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (tx.razorpayOrderId !== input.razorpay_order_id) {
    const err = new Error("Order id does not match transaction");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const valid = verifyPaymentSignature(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature,
    config.keySecret
  );
  if (!valid) {
    const err = new Error("Invalid payment signature");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  if (
    tx.paymentStatus !== "payment_captured" &&
    tx.paymentStatus !== "payout_initiated" &&
    tx.paymentStatus !== "payout_processed"
  ) {
    tx.razorpayPaymentId = input.razorpay_payment_id;
    tx.upiRefId = input.razorpay_payment_id;
    tx.paymentStatus = "payment_captured";
    tx.hasMatchingAllpayRecord = !config.accountNumber;
    tx.paymentConfirmedAt = dayjs().toISOString();
    appendTimeline(
      tx,
      config.accountNumber
        ? "Employee paid AllPay via Razorpay · paying shop next"
        : "Employee paid AllPay via Razorpay · shop payout waiting for RazorpayX"
    );
  }
  if (input.location && (tx.latitude == null || tx.longitude == null)) {
    applyLocationToRecord(tx, input.location);
  }
  await tx.save();
  const settled = await settleMerchantPayout(tx.id);
  return settled ?? tx;
}

type RazorpayWebhookEvent = {
  event: string;
  id?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
    payout?: { entity?: Record<string, unknown> };
  };
};

export async function handleRazorpayWebhookEvent(
  rawBody: string,
  signature: string,
  eventIdHeader?: string
): Promise<{ ok: boolean; duplicate?: boolean }> {
  const config = loadRazorpayConfig();
  const signed =
    verifyWebhookSignature(rawBody, signature, config.webhookSecret) ||
    (config.payoutWebhookSecret !== config.webhookSecret &&
      verifyWebhookSignature(rawBody, signature, config.payoutWebhookSecret));
  if (!signed) {
    const err = new Error("Invalid webhook signature");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  const eventId = eventIdHeader ?? event.id ?? `${event.event}-${Date.now()}`;

  const existingEvent = await ProcessedWebhookEvent.findOne({ eventId }).exec();
  if (existingEvent) {
    return { ok: true, duplicate: true };
  }

  await ProcessedWebhookEvent.create({
    eventId,
    eventType: event.event,
    processedAt: dayjs().toISOString(),
  });

  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const payoutEntity = event.payload?.payout?.entity;

  let orderId =
    (paymentEntity?.order_id as string | undefined) ??
    (orderEntity?.id as string | undefined);

  const receipt =
    (orderEntity?.receipt as string | undefined) ??
    (paymentEntity?.notes as { receipt?: string } | undefined)?.receipt;

  let tx: ITransaction | null = null;
  if (orderId) {
    tx = await Transaction.findOne({ razorpayOrderId: orderId }).exec();
  }
  if (!tx && receipt) {
    tx = await Transaction.findOne({ id: receipt }).exec();
  }
  if (!tx && payoutEntity?.id) {
    tx = await Transaction.findOne({ razorpayPayoutId: String(payoutEntity.id) }).exec();
  }
  if (!tx && payoutEntity?.reference_id) {
    tx = await Transaction.findOne({ id: String(payoutEntity.reference_id) }).exec();
  }

  if (!tx) {
    return { ok: true };
  }

  if (!tx.razorpayWebhookEventIds) {
    tx.razorpayWebhookEventIds = [];
  }
  if (!tx.razorpayWebhookEventIds.includes(eventId)) {
    tx.razorpayWebhookEventIds.push(eventId);
  }

  if (String(event.event).startsWith("payout.")) {
    const changed = applyPayoutWebhookToTransaction(tx, event.event, {
      id: payoutEntity?.id as string | undefined,
      status: payoutEntity?.status as string | undefined,
      utr: payoutEntity?.utr as string | undefined,
      reference_id: payoutEntity?.reference_id as string | undefined,
    });
    if (changed) {
      await tx.save();
    }
    if (tx.paymentStatus === "payout_failed" && !tx.refundId) {
      await refundCapturedPayment(tx, tx.payoutFailedReason || "Shop payout failed");
    }
    return { ok: true };
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    if (tx.paymentStatus !== "payout_processed") {
      const paymentId = paymentEntity?.id as string | undefined;
      const capturedAmount = paymentEntity?.amount as number | undefined;
      tx.paymentStatus = assertValidPaymentStatus("payment_captured");
      if (paymentId) {
        tx.razorpayPaymentId = paymentId;
      }
      if (typeof capturedAmount === "number") {
        tx.capturedAmountPaise = capturedAmount;
      }
      tx.hasMatchingAllpayRecord = !config.accountNumber;
      tx.paymentConfirmedAt = dayjs().toISOString();
      appendTimeline(
        tx,
        config.accountNumber
          ? "Employee payment captured · paying shop next"
          : "Employee payment captured · shop payout skipped"
      );
      await tx.save();
      await settleMerchantPayout(tx.id);
    }
  } else if (event.event === "payment.failed") {
    if (tx.paymentStatus !== "payment_captured" && tx.paymentStatus !== "payout_processed") {
      tx.paymentStatus = assertValidPaymentStatus("payment_failed");
      tx.paymentFailedReason =
        (paymentEntity?.error_description as string | undefined) ?? "Payment failed";
      appendTimeline(tx, "Webhook: payment.failed");
      await tx.save();
    }
  }

  return { ok: true };
}

export async function markCheckoutOpened(txId: string, companyId?: string): Promise<void> {
  const query: Record<string, unknown> = { id: txId };
  if (companyId) query.companyId = companyId;
  const tx = await Transaction.findOne(query).exec();
  if (
    !tx ||
    tx.paymentStatus === "payment_captured" ||
    tx.paymentStatus === "payout_initiated" ||
    tx.paymentStatus === "payout_processed" ||
    tx.paymentStatus === "refunded"
  ) {
    return;
  }
  if (tx.paymentStatus === "order_created") {
    tx.paymentStatus = "checkout_opened";
    appendTimeline(tx, "Checkout opened");
    await tx.save();
  }
}
