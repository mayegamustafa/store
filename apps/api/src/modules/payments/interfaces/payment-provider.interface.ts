// Payment Gateway Abstraction Interface
// Every payment provider must implement this contract

export interface PaymentInitParams {
  orderId: string;
  amount: number;
  currency: string;
  phone?: string;          // for mobile money
  email?: string;
  customerName?: string;   // full name — providers may split into first/last
  description: string;
  callbackUrl: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResult {
  success: boolean;
  providerRef: string;      // transaction ID from provider
  redirectUrl?: string;     // for web-based payments
  ussdCode?: string;        // for USSD payments
  message?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  providerRef: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  paidAt?: Date;
  rawResponse?: any;
}

export interface PaymentRefundParams {
  providerRef: string;
  amount: number;
  reason: string;
}

export interface IPaymentProvider {
  readonly name: string;
  initiate(params: PaymentInitParams): Promise<PaymentInitResult>;
  verify(providerRef: string): Promise<PaymentVerifyResult>;
  refund(params: PaymentRefundParams): Promise<{ success: boolean; message: string }>;
}
