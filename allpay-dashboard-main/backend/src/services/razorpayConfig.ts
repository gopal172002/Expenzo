const PAYMENT_STATUSES = [
  "draft",
  "order_created",
  "checkout_opened",
  "payment_processing",
  "payment_captured",
  "payout_initiated",
  "payout_processed",
  "payout_failed",
  "refund_initiated",
  "refunded",
  "payment_failed",
  "payment_abandoned",
  "legacy_simulated",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const TERMINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "payout_processed",
  "payout_failed",
  "refunded",
  "payment_captured",
  "payment_failed",
  "payment_abandoned",
  "legacy_simulated",
]);

export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function assertValidPaymentStatus(value: string): PaymentStatus {
  if (!isValidPaymentStatus(value)) {
    throw new Error(`Invalid paymentStatus: ${value}`);
  }
  return value;
}

function isTerminalPaymentStatus(status: PaymentStatus | undefined): boolean {
  return status !== undefined && TERMINAL_PAYMENT_STATUSES.has(status);
}

export function isPaymentCaptured(status: PaymentStatus | undefined): boolean {
  return (
    status === "payout_processed" ||
    status === "payment_captured" ||
    status === "legacy_simulated"
  );
}

export function isMerchantPayoutComplete(status: PaymentStatus | undefined): boolean {
  return status === "payout_processed";
}

export function isShopPayoutEnabled(config = loadRazorpayConfig()): boolean {
  return Boolean(config.accountNumber);
}

export type RazorpayRuntimeConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  payoutWebhookSecret: string;
  accountNumber: string;
  useRazorpayUpi: boolean;
  isProduction: boolean;
};

export function loadRazorpayConfig(): RazorpayRuntimeConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const useRazorpayUpi = process.env.USE_RAZORPAY_UPI === "true" || process.env.USE_RAZORPAY_UPI === "1";
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  const payoutWebhookSecret =
    process.env.RAZORPAYX_WEBHOOK_SECRET?.trim() || webhookSecret;
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER?.trim() ?? "";

  if (isProduction && useRazorpayUpi) {
    if (!keyId || !keySecret || !webhookSecret) {
      throw new Error(
        "Razorpay is enabled but RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET must be set in production"
      );
    }
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
    payoutWebhookSecret,
    accountNumber,
    useRazorpayUpi,
    isProduction,
  };
}

export function requireRazorpaySecrets(config: RazorpayRuntimeConfig): void {
  if (!config.keyId || !config.keySecret) {
    throw new Error("Razorpay API credentials are not configured");
  }
}
