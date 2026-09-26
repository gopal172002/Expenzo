import {
  buildMerchantCheckoutOptions,
  checkoutErrorMessage,
  isCheckoutSettled,
  isCollectedPayment,
  isFailedPayment,
} from '../src/services/razorpayMerchantPay';

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    close: jest.fn(),
  },
}));

describe('razorpay merchant checkout helpers', () => {
  it('treats AllPay capture as success even before the shop is paid', () => {
    expect(isCollectedPayment('payment_captured')).toBe(true);
    expect(isCollectedPayment('payout_initiated')).toBe(true);
    expect(isCollectedPayment('payout_processed')).toBe(true);
    expect(isCollectedPayment('payment_failed')).toBe(false);
  });

  it('leaves checkout once AllPay has a terminal hop-1 or hop-2 status', () => {
    expect(isCheckoutSettled('payment_captured')).toBe(true);
    expect(isCheckoutSettled('payment_failed')).toBe(true);
    expect(isCheckoutSettled('checkout_opened')).toBe(false);
    expect(isFailedPayment('payment_failed')).toBe(true);
  });

  it('disables Razorpay retry so checkout closes after the first attempt', () => {
    const options = buildMerchantCheckoutOptions({
      key: 'rzp_test_x',
      amount: '100',
      currency: 'INR',
      name: 'AllPay',
      description: 'Pay Default',
      orderId: 'order_1',
      employeeName: 'Emp',
      contact: '9024769007',
      themeColor: '#001',
    });
    expect(options.retry).toEqual({enabled: false, max_count: 0});
    expect(options.order_id).toBe('order_1');
    expect(options.timeout).toBe(180);
  });

  it('reads Razorpay overlay errors', () => {
    expect(
      checkoutErrorMessage({
        description: 'We are facing some trouble completing your request at the moment.',
      }),
    ).toMatch(/trouble completing/i);
  });
});
