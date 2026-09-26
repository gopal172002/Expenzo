export type PaymentExplanation = {
  title: string;
  hop1: string;
  hop2: string;
};

export function explainPaymentStatus(
  status: string | undefined,
  shopPayoutEnabled: boolean,
): PaymentExplanation {
  switch (status) {
    case 'payout_processed':
      return {
        title: 'Shop paid',
        hop1: 'You paid AllPay. Razorpay captured the payment.',
        hop2: 'AllPay paid this shop’s UPI ID. The shop UTR is on this expense.',
      };
    case 'payout_initiated':
      return {
        title: 'Paying the shop',
        hop1: 'You paid AllPay. Razorpay captured the payment.',
        hop2: 'AllPay has started the shop UPI payout.',
      };
    case 'payment_captured':
      return shopPayoutEnabled
        ? {
            title: 'AllPay received payment',
            hop1: 'You paid AllPay. Razorpay captured the payment.',
            hop2: 'Shop payout is still in progress. The shop is not marked paid yet.',
          }
        : {
            title: 'AllPay received payment',
            hop1: 'You paid AllPay. Razorpay captured the payment.',
            hop2: 'The shop was not paid. RazorpayX is not connected on the server.',
          };
    case 'payout_failed':
      return {
        title: 'Shop payout failed',
        hop1: 'You paid AllPay. Razorpay captured the payment.',
        hop2: 'AllPay could not pay the shop. A refund should follow.',
      };
    case 'refund_initiated':
      return {
        title: 'Refund started',
        hop1: 'You paid AllPay.',
        hop2: 'The shop was not paid. AllPay is refunding your Razorpay payment.',
      };
    case 'refunded':
      return {
        title: 'Refunded',
        hop1: 'Your Razorpay payment to AllPay was refunded.',
        hop2: 'The shop was not paid.',
      };
    case 'payment_failed':
      return {
        title: 'Payment failed',
        hop1: 'Razorpay did not take money from you.',
        hop2: 'The shop was not paid.',
      };
    case 'payment_abandoned':
      return {
        title: 'Checkout closed',
        hop1: 'Razorpay checkout closed. AllPay is checking whether that order was already captured.',
        hop2: 'The shop is paid only after AllPay payout. A capture on AllPay still counts as paid to AllPay.',
      };
    case 'checkout_opened':
    case 'order_created':
      return {
        title: 'Payment not finished',
        hop1: 'Checkout did not complete a signed success.',
        hop2: 'The shop was not paid.',
      };
    case 'payment_processing':
      return {
        title: 'Confirming payment',
        hop1: 'Razorpay checkout finished. AllPay is confirming capture.',
        hop2: shopPayoutEnabled
          ? 'Shop payout starts after capture.'
          : 'Shop payout is skipped until RazorpayX is connected.',
      };
    default:
      return {
        title: 'Payment update',
        hop1: 'AllPay is updating this Razorpay collect.',
        hop2: shopPayoutEnabled
          ? 'Shop payout runs only after capture.'
          : 'Shop payout is skipped until RazorpayX is connected.',
      };
  }
}
