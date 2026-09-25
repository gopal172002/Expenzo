import {authHeaders} from './auth';
import {API_BASE} from './apiConfig';
import type {LocationPoint} from '../types';
import {locationToPaymentPayload} from './locationSnapshot';

export type MerchantOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  txId: string;
  shopPayoutEnabled: boolean;
};

export type MerchantPaymentStatus = {
  paymentStatus: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPayoutId?: string | null;
  payoutUtr?: string | null;
  payoutFailedReason?: string | null;
  shopPayoutEnabled?: boolean;
  expenseStatus?: string;
  summary?: {
    title: string;
    hop1: string;
    hop2: string;
  };
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function createMerchantOrder(input: {
  txId: string;
  amount: number;
  employeeId: string;
  merchant: {
    vpa: string;
    name: string;
    category: string;
    mcc: string;
    amount?: number;
  };
}): Promise<MerchantOrder> {
  const res = await fetch(`${API_BASE}/mobile/payments/create-order`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.message ?? 'Could not create Razorpay order'));
  }
  return {
    orderId: String(data.orderId),
    amount: Number(data.amount),
    currency: String(data.currency ?? 'INR'),
    keyId: String(data.keyId),
    txId: String(data.txId ?? input.txId),
    shopPayoutEnabled: data.shopPayoutEnabled === true,
  };
}

export async function markMerchantCheckoutOpened(txId: string): Promise<void> {
  await fetch(`${API_BASE}/mobile/payments/checkout-opened`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({txId}),
  }).catch(() => undefined);
}

export async function confirmMerchantPayment(input: {
  txId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  location?: LocationPoint;
}): Promise<MerchantPaymentStatus> {
  const res = await fetch(`${API_BASE}/mobile/payments/confirm`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      txId: input.txId,
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
      razorpay_signature: input.razorpay_signature,
      ...locationToPaymentPayload(input.location ?? null),
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.message ?? 'Could not confirm payment'));
  }
  return parseMerchantPaymentStatus(data, 'payment_processing');
}

export async function fetchMerchantPaymentStatus(txId: string): Promise<MerchantPaymentStatus> {
  const res = await fetch(
    `${API_BASE}/mobile/transactions/${encodeURIComponent(txId)}/payment-status`,
    {headers: await authHeaders()},
  );
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.message ?? 'Could not load payment status'));
  }
  return parseMerchantPaymentStatus(data, 'draft');
}

function parseMerchantPaymentStatus(
  data: Record<string, unknown>,
  fallbackStatus: string,
): MerchantPaymentStatus {
  const summaryRaw = data.summary;
  const summary =
    summaryRaw && typeof summaryRaw === 'object'
      ? {
          title: String((summaryRaw as {title?: unknown}).title ?? ''),
          hop1: String((summaryRaw as {hop1?: unknown}).hop1 ?? ''),
          hop2: String((summaryRaw as {hop2?: unknown}).hop2 ?? ''),
        }
      : undefined;
  return {
    paymentStatus: String(data.paymentStatus ?? fallbackStatus),
    razorpayPaymentId: typeof data.razorpayPaymentId === 'string' ? data.razorpayPaymentId : null,
    razorpayOrderId: typeof data.razorpayOrderId === 'string' ? data.razorpayOrderId : null,
    razorpayPayoutId: typeof data.razorpayPayoutId === 'string' ? data.razorpayPayoutId : null,
    payoutUtr: typeof data.payoutUtr === 'string' ? data.payoutUtr : null,
    payoutFailedReason: typeof data.payoutFailedReason === 'string' ? data.payoutFailedReason : null,
    shopPayoutEnabled: data.shopPayoutEnabled === true,
    expenseStatus: typeof data.expenseStatus === 'string' ? data.expenseStatus : undefined,
    summary: summary?.title ? summary : undefined,
  };
}

export function checkoutErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object') {
    const body = error as {
      message?: string;
      description?: string;
      error?: {description?: string; reason?: string};
    };
    const text =
      body.description ||
      body.error?.description ||
      body.error?.reason ||
      body.message;
    if (text?.trim()) {
      return text;
    }
  }
  return 'Payment cancelled';
}

export function isCollectedPayment(status: string): boolean {
  return status === 'payout_processed' || status === 'payment_captured';
}

export function isFailedPayment(status: string): boolean {
  return (
    status === 'payout_failed' ||
    status === 'refunded' ||
    status === 'payment_failed' ||
    status === 'refund_initiated'
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForShopPayout(
  txId: string,
  timeoutMs = 45000,
  shopPayoutEnabled = false,
): Promise<MerchantPaymentStatus> {
  const started = Date.now();
  let latest: MerchantPaymentStatus = {paymentStatus: 'payment_processing'};
  while (Date.now() - started < timeoutMs) {
    latest = await fetchMerchantPaymentStatus(txId);
    const payoutOn = shopPayoutEnabled || latest.shopPayoutEnabled;
    if (latest.paymentStatus === 'payout_processed') {
      return latest;
    }
    if (
      latest.paymentStatus === 'payout_failed' ||
      latest.paymentStatus === 'refunded' ||
      latest.paymentStatus === 'payment_failed'
    ) {
      return latest;
    }
    if (latest.paymentStatus === 'payment_captured' && !payoutOn) {
      return latest;
    }
    await sleep(2000);
  }
  return latest;
}
