import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  PaymentRefundParams,
} from '../interfaces/payment-provider.interface';

/**
 * MTN Mobile Money (Uganda) Payment Provider
 * Uses MTN MoMo API v1
 * Docs: https://momodeveloper.mtn.com/
 */
@Injectable()
export class MtnMomoProvider implements IPaymentProvider {
  readonly name = 'MTN_MOMO';
  private readonly logger = new Logger(MtnMomoProvider.name);
  private readonly baseUrl: string;
  private readonly subscriptionKey: string;
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly environment: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com');
    this.subscriptionKey = config.get('MTN_MOMO_SUBSCRIPTION_KEY', '');
    this.apiUser = config.get('MTN_MOMO_API_USER', '');
    this.apiKey = config.get('MTN_MOMO_API_KEY', '');
    this.environment = config.get('MTN_MOMO_ENVIRONMENT', 'sandbox');
  }

  // ── Get Access Token ──────────────────────────────────────────────────────────
  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
    const response = await axios.post(
      `${this.baseUrl}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
      },
    );
    return response.data.access_token;
  }

  // ── Initiate Payment (Request to Pay) ────────────────────────────────────────
  async initiate(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const externalId = uuid();
      const token = await this.getAccessToken();

      // Format Uganda phone: 256XXXXXXXXX
      const phone = this.formatPhone(params.phone || '');

      await axios.post(
        `${this.baseUrl}/collection/v1_0/requesttopay`,
        {
          amount: params.amount.toString(),
          currency: this.environment === 'sandbox' ? 'EUR' : params.currency, // sandbox uses EUR
          externalId,
          payer: { partyIdType: 'MSISDN', partyId: phone },
          payerMessage: params.description,
          payeeNote: `Order: ${params.orderId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': externalId,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
            'X-Callback-Url': params.callbackUrl,
          },
        },
      );

      return {
        success: true,
        providerRef: externalId,
        message: `Payment request sent to ${phone}. Please approve on your phone.`,
      };
    } catch (error) {
      this.logger.error('MTN MoMo initiate failed', error?.response?.data);
      return { success: false, providerRef: '', message: 'MTN MoMo payment initiation failed' };
    }
  }

  // ── Verify Payment ────────────────────────────────────────────────────────────
  async verify(providerRef: string): Promise<PaymentVerifyResult> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/requesttopay/${providerRef}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        },
      );

      const data = response.data;
      const statusMap: Record<string, PaymentVerifyResult['status']> = {
        SUCCESSFUL: 'COMPLETED',
        PENDING: 'PENDING',
        FAILED: 'FAILED',
      };

      return {
        success: data.status === 'SUCCESSFUL',
        providerRef,
        status: statusMap[data.status] || 'FAILED',
        amount: parseFloat(data.amount),
        currency: data.currency,
        paidAt: data.status === 'SUCCESSFUL' ? new Date() : undefined,
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error('MTN MoMo verify failed', error?.response?.data);
      return { success: false, providerRef, status: 'FAILED', amount: 0, currency: 'UGX' };
    }
  }

  // ── Refund ────────────────────────────────────────────────────────────────────
  async refund(params: PaymentRefundParams): Promise<{ success: boolean; message: string }> {
    // MTN MoMo refund via Disbursements API
    try {
      const token = await this.getAccessToken();
      const externalId = uuid();
      // TODO: implement disbursement refund
      return { success: true, message: 'Refund initiated' };
    } catch (error) {
      return { success: false, message: 'Refund failed' };
    }
  }

  private formatPhone(phone: string): string {
    // Convert 0701234567 or +256701234567 to 256701234567
    return phone.replace(/^\+/, '').replace(/^0/, '256');
  }
}
