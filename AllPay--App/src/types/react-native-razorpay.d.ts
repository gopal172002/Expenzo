declare module 'react-native-razorpay' {
  type RazorpayCheckoutOptions = {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    method?: string;
    timeout?: number;
    retry?: {
      enabled?: boolean;
      max_count?: number;
    };
    modal?: {
      confirm_close?: boolean;
      escape?: boolean;
      backdrop_close?: boolean;
    };
    prefill?: {
      name?: string;
      contact?: string;
      email?: string;
    };
    theme?: {
      color?: string;
    };
    notes?: Record<string, string>;
  };

  type RazorpayCheckoutSuccess = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutSuccess>;
    close?: () => void;
  };

  export default RazorpayCheckout;
}
