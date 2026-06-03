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
 * Airtel Money Payment Provider
 * Uganda, Kenya, Tanzania, Rwanda, Nigeria, Zambia, etc.
 * Docs: https://developers.airtel.africa/
 */
@Injectable()
export class AirtelMoneyProvider implements IPaymentProvider {
  readonly name = 'AIRTEL_MONEY';
  private readonly logger = new Logger(AirtelMoneyProvider.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private config: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const baseUrl = this.config.get('AIRTEL_BASE_URL', 'https://openapi.airtel.africa');
    const response = await axios.post(`${baseUrl}/auth/oauth2/token`, {
      client_id: this.config.get('AIRTEL_CLIENT_ID'),
      client_secret: this.config.get('AIRTEL_CLIENT_SECRET'),
      grant_type: 'client_credentials',
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
    return this.accessToken!;
  }

  async initiate(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      const baseUrl = this.config.get('AIRTEL_BASE_URL', 'https://openapi.airtel.africa');
      const token = await this.getAccessToken();
      const transactionId = uuid();
      const phone = this.formatPhone(params.phone || '');

      await axios.post(
        `${baseUrl}/merchant/v1/payments/`,
        {
          reference: params.orderId,
          subscriber: { country: 'UG', currency: 'UGX', msisdn: phone },
          transaction: { amount: params.amount, country: 'UG', currency: 'UGX', id: transactionId },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': 'UGX',
            'Content-Type': 'application/json',
          },
        },
      );

      return { success: true, providerRef: transactionId, message: 'Airtel Money payment request sent' };
    } catch (error) {
      this.logger.error('Airtel Money initiate failed', error?.response?.data);
      return { success: false, providerRef: '', message: 'Airtel Money payment failed' };
    }
  }

  async verify(providerRef: string): Promise<PaymentVerifyResult> {
    try {
      const baseUrl = this.config.get('AIRTEL_BASE_URL', 'https://openapi.airtel.africa');
      const token = await this.getAccessToken();
      const response = await axios.get(`${baseUrl}/standard/v1/payments/${providerRef}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Country': 'UG', 'X-Currency': 'UGX' },
      });

      const data = response.data.data?.transaction;
      const isSuccess = data?.status === 'TS';

      return {
        success: isSuccess,
        providerRef,
        status: isSuccess ? 'COMPLETED' : data?.status === 'TIP' ? 'PENDING' : 'FAILED',
        amount: data?.amount || 0,
        currency: 'UGX',
        rawResponse: response.data,
      };
    } catch (error) {
      return { success: false, providerRef, status: 'FAILED', amount: 0, currency: 'UGX' };
    }
  }

  async refund(params: PaymentRefundParams): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Contact support for Airtel Money refund' };
  }

  private formatPhone(phone: string): string {
    return phone.replace(/^\+/, '').replace(/^0/, '256');
  }
}
