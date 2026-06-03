import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  PaymentRefundParams,
} from '../interfaces/payment-provider.interface';

/**
 * Pesapal API 3.0 Payment Provider (REST/JSON)
 * Supports: Uganda (UGX), Kenya (KES), Tanzania (TZA), Rwanda, Zambia, Zimbabwe, Ghana, Egypt…
 * Payment methods: Visa, Mastercard, MTN MoMo, Airtel Money, M-Pesa, and more
 * Docs: https://developer.pesapal.com/
 * Sandbox: https://cybqa.pesapal.com/pesapalv3
 * Live:    https://pay.pesapal.com/v3
 */
@Injectable()
export class PesapalProvider implements IPaymentProvider {
  readonly name = 'PESAPAL';
  private readonly logger = new Logger(PesapalProvider.name);
  private readonly apiUrl: string;

  // ── Token cache ───────────────────────────────────────────────────────────────
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // ── IPN cache ─────────────────────────────────────────────────────────────────
  // Register once per app lifecycle; re-registration is harmless but wasteful.
  private cachedIpnId: string | null = null;

  constructor(private config: ConfigService) {
    this.apiUrl = config.get('PESAPAL_API_URL', 'https://cybqa.pesapal.com/pesapalv3');
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────
  private async getAccessToken(): Promise<string> {
    const now = new Date();
    // Refresh when we have < 30 s remaining (Pesapal tokens expire in 5 min)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry.getTime() - now.getTime() > 30_000) {
      return this.accessToken;
    }

    const response = await axios.post(
      `${this.apiUrl}/api/Auth/RequestToken`,
      {
        consumer_key: this.config.get('PESAPAL_CONSUMER_KEY'),
        consumer_secret: this.config.get('PESAPAL_CONSUMER_SECRET'),
      },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } },
    );

    if (response.data.error) {
      throw new Error(`Pesapal auth error: ${response.data.error.message}`);
    }

    this.accessToken = response.data.token;
    // Expire 30 s before the server expiry (4 min 30 s is safe)
    this.tokenExpiry = new Date(Date.now() + 4.5 * 60 * 1000);
    return this.accessToken!;
  }

  // ── IPN Registration ─────────────────────────────────────────────────────────
  /**
   * Register (or reuse cached) IPN URL and return its ipn_id.
   * The IPN URL must be publicly reachable. In production set PESAPAL_IPN_URL
   * to your server's public URL, e.g. https://api.example.com/api/v1/payments/ipn
   */
  private async getIpnId(token: string): Promise<string> {
    if (this.cachedIpnId) return this.cachedIpnId;

    const ipnUrl = this.config.get<string>('PESAPAL_IPN_URL');
    if (!ipnUrl) throw new Error('PESAPAL_IPN_URL env variable is not set');

    // Try to find an existing registration to avoid duplicates
    try {
      const listResp = await axios.get(`${this.apiUrl}/api/URLSetup/GetIpnList`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const existing = Array.isArray(listResp.data)
        ? listResp.data.find((r: any) => r.url === ipnUrl && r.ipn_status === 1)
        : null;
      if (existing?.ipn_id) {
        this.cachedIpnId = existing.ipn_id;
        this.logger.log(`Reusing existing IPN registration: ${this.cachedIpnId}`);
        return this.cachedIpnId!;
      }
    } catch {
      // Non-fatal: fall through to registration
    }

    // Register fresh IPN URL (GET method — Pesapal sends GET with query params)
    const regResp = await axios.post(
      `${this.apiUrl}/api/URLSetup/RegisterIPN`,
      { url: ipnUrl, ipn_notification_type: 'GET' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' } },
    );

    if (regResp.data.error) {
      throw new Error(`IPN registration error: ${regResp.data.error.message}`);
    }

    this.cachedIpnId = regResp.data.ipn_id;
    this.logger.log(`IPN registered: ${this.cachedIpnId} → ${ipnUrl}`);
    return this.cachedIpnId!;
  }

  // ── Initiate Payment ──────────────────────────────────────────────────────────
  async initiate(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const token = await this.getAccessToken();
      const ipnId = await this.getIpnId(token);

      // Merchant reference: UUIDs are 36 chars and use only hex digits + dashes — safe.
      const merchantRef = params.orderId;

      // Customer name split
      const nameParts = (params.customerName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const orderResp = await axios.post(
        `${this.apiUrl}/api/Transactions/SubmitOrderRequest`,
        {
          id: merchantRef,
          currency: params.currency || 'UGX',
          amount: Number(params.amount),
          description: (params.description || `Order ${merchantRef}`).slice(0, 100),
          callback_url: params.returnUrl || params.callbackUrl,
          redirect_mode: 'TOP_WINDOW',
          notification_id: ipnId,
          branch: this.config.get('PESAPAL_BRANCH', 'TotalStore'),
          billing_address: {
            email_address: params.email || undefined,
            phone_number: params.phone || undefined,
            country_code: 'UG',
            first_name: firstName || undefined,
            last_name: lastName || undefined,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      if (orderResp.data.error) {
        throw new Error(orderResp.data.error.message || 'SubmitOrderRequest failed');
      }

      return {
        success: true,
        providerRef: orderResp.data.order_tracking_id,
        redirectUrl: orderResp.data.redirect_url,
        message: 'Redirect customer to Pesapal payment page',
      };
    } catch (error: any) {
      this.logger.error('Pesapal initiate failed', error?.response?.data ?? error.message);
      return {
        success: false,
        providerRef: '',
        message: error?.response?.data?.error?.message || error.message || 'Pesapal payment failed',
      };
    }
  }

  // ── Verify Transaction Status ─────────────────────────────────────────────────
  async verify(providerRef: string): Promise<PaymentVerifyResult> {
    try {
      const token = await this.getAccessToken();
      const resp = await axios.get(
        `${this.apiUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${providerRef}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
      );

      const d = resp.data;
      // status_code: 0=INVALID 1=COMPLETED 2=FAILED 3=REVERSED
      let status: 'COMPLETED' | 'PENDING' | 'FAILED';
      if (d.status_code === 1) status = 'COMPLETED';
      else if (d.status_code === 0) status = 'PENDING';
      else status = 'FAILED';

      return {
        success: d.status_code === 1,
        providerRef,
        status,
        amount: d.amount || 0,
        currency: d.currency || 'UGX',
        rawResponse: d,
      };
    } catch (error: any) {
      this.logger.error('Pesapal verify failed', error?.response?.data ?? error.message);
      return { success: false, providerRef, status: 'FAILED', amount: 0, currency: 'UGX' };
    }
  }

  // ── B2C Payout (Send Money to Mobile Money) ────────────────────────────────
  async sendMoney(params: {
    reference: string;
    amount: number;
    currency?: string;
    phone: string;
    description: string;
    callbackUrl?: string;
  }): Promise<{ success: boolean; providerRef: string; message: string }> {
    try {
      const token = await this.getAccessToken();
      const ipnId = await this.getIpnId(token);

      const resp = await axios.post(
        `${this.apiUrl}/api/Transactions/SubmitOrderRequest`,
        {
          id: params.reference,
          currency: params.currency || 'UGX',
          amount: Number(params.amount),
          description: (params.description || 'Payout').slice(0, 100),
          callback_url: params.callbackUrl || `${this.config.get('API_URL')}/api/v1/wallet/payout-callback`,
          redirect_mode: 'TOP_WINDOW',
          notification_id: ipnId,
          branch: this.config.get('PESAPAL_BRANCH', 'TotalStore'),
          billing_address: {
            phone_number: params.phone,
            country_code: 'UG',
            first_name: 'Payout',
            last_name: 'Recipient',
          },
          account_number: params.phone,
          subscription_type: 'NONE',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      if (resp.data.error) {
        throw new Error(resp.data.error.message || 'SendMoney failed');
      }

      return {
        success: true,
        providerRef: resp.data.order_tracking_id,
        message: resp.data.redirect_url
          ? 'Payout initiated — redirect to complete'
          : 'Payout submitted successfully',
      };
    } catch (error: any) {
      this.logger.error('Pesapal sendMoney failed', error?.response?.data ?? error.message);
      return {
        success: false,
        providerRef: '',
        message: error?.response?.data?.error?.message || error.message || 'Payout request failed',
      };
    }
  }

  // ── Refund ────────────────────────────────────────────────────────────────────
  async refund(params: PaymentRefundParams): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      const resp = await axios.post(
        `${this.apiUrl}/api/Transactions/RefundRequest`,
        {
          confirmation_code: params.providerRef,
          amount: String(params.amount),
          username: 'TotalStore Admin',
          remarks: params.reason || 'Customer refund request',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );
      return {
        success: resp.data.status === '200',
        message: resp.data.message || 'Refund request submitted',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.error?.message || 'Refund request failed',
      };
    }
  }
}
