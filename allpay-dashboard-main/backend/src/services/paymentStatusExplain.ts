export type PaymentExplanation = {
  title: string;
  hop1: string;
  hop2: string;
};

export function explainPaymentStatus(
  status: string | undefined,
  shopPayoutEnabled: boolean
): PaymentExplanation {
  switch (status) {
    case "payout_processed":
      return {
        title: "Shop paid",
        hop1: "Employee paid AllPay. Razorpay captured the payment.",
        hop2: "AllPay paid the shop UPI ID. The shop UTR is on this transaction.",
      };
    case "payout_initiated":
      return {
        title: "Paying the shop",
        hop1: "Employee paid AllPay. Razorpay captured the payment.",
        hop2: "AllPay has started the RazorpayX UPI payout to the shop.",
      };
    case "payment_captured":
      return shopPayoutEnabled
        ? {
            title: "AllPay received payment",
            hop1: "Employee paid AllPay. Razorpay captured the payment.",
            hop2: "Shop payout is still in progress. This is not the final shop-paid state.",
          }
        : {
            title: "AllPay received payment",
            hop1: "Employee paid AllPay. Razorpay captured the payment.",
            hop2: "Shop was not paid. RAZORPAYX_ACCOUNT_NUMBER is empty, so payout is skipped.",
          };
    case "payout_failed":
      return {
        title: "Shop payout failed",
        hop1: "Employee paid AllPay. Razorpay captured the payment.",
        hop2: "AllPay could not pay the shop. A refund to the employee should follow.",
      };
    case "refund_initiated":
      return {
        title: "Refund started",
        hop1: "Employee paid AllPay.",
        hop2: "Shop was not paid. AllPay is refunding the employee Razorpay payment.",
      };
    case "refunded":
      return {
        title: "Refunded",
        hop1: "The employee Razorpay payment was refunded.",
        hop2: "The shop was not paid.",
      };
    case "payment_failed":
      return {
        title: "Payment failed",
        hop1: "Razorpay did not capture money from the employee.",
        hop2: "The shop was not paid.",
      };
    case "payment_abandoned":
    case "checkout_opened":
    case "order_created":
      return {
        title: status === "payment_abandoned" ? "Checkout closed" : "Payment not finished",
        hop1: "Checkout did not return a signed success yet. Confirm against Razorpay before treating this as unpaid.",
        hop2: "The shop was not paid.",
      };
    case "payment_processing":
      return {
        title: "Confirming payment",
        hop1: "Razorpay checkout finished. AllPay is confirming capture.",
        hop2: shopPayoutEnabled
          ? "Shop payout starts after capture."
          : "Shop payout is skipped until RazorpayX is configured.",
      };
    default:
      return {
        title: "Payment update",
        hop1: "AllPay is updating this Razorpay collect.",
        hop2: shopPayoutEnabled
          ? "Shop payout runs only after capture."
          : "Shop payout is skipped until RazorpayX is configured.",
      };
  }
}
