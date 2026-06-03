import { Controller, Post, Get, Body, Param, Query, UseGuards, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { WebhookEventsService } from '../webhook-events/webhook-events.service';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';

class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiProperty({ required: false }) @IsString() @IsOptional() phone?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() email?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() returnUrl?: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private webhookEvents: WebhookEventsService,
  ) {}

  @Post('orders/:orderId/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for an order (MTN/Airtel/Pesapal/COD)' })
  initiate(
    @Param('orderId') orderId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(orderId, dto.method, dto.phone, dto.email, dto.returnUrl);
  }

  @Get('orders/:orderId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Poll and confirm payment status' })
  confirm(@Param('orderId') orderId: string) {
    return this.paymentsService.confirmPayment(orderId);
  }

  // Webhook endpoints (public — called by payment gateways).
  // All IPN handlers dedupe via WebhookEvent table to prevent replay/double-credit.
  // TODO (M1 follow-up): add HMAC signature verification per provider spec.
  @Public()
  @Post('callback/mtn_momo')
  @ApiOperation({ summary: 'MTN MoMo IPN callback' })
  async mtnCallback(@Body() payload: any) {
    const eventId = payload?.referenceId || payload?.financialTransactionId || payload?.externalId;
    const evt = await this.webhookEvents.record('mtn_momo', String(eventId || ''), payload);
    if (evt.isDuplicate) return { received: true, deduped: true };
    try {
      const result = await this.paymentsService.handleCallback('mtn_momo', payload);
      await this.webhookEvents.markProcessed(evt.id);
      return result;
    } catch (e: any) {
      await this.webhookEvents.markFailed(evt.id, e?.message || 'unknown');
      throw e;
    }
  }

  @Public()
  @Post('callback/airtel_money')
  @ApiOperation({ summary: 'Airtel Money callback' })
  async airtelCallback(@Body() payload: any) {
    const eventId = payload?.transaction?.id || payload?.transactionId || payload?.id;
    const evt = await this.webhookEvents.record('airtel_money', String(eventId || ''), payload);
    if (evt.isDuplicate) return { received: true, deduped: true };
    try {
      const result = await this.paymentsService.handleCallback('airtel_money', payload);
      await this.webhookEvents.markProcessed(evt.id);
      return result;
    } catch (e: any) {
      await this.webhookEvents.markFailed(evt.id, e?.message || 'unknown');
      throw e;
    }
  }

  /**
   * Pesapal IPN handler — supports both GET (query params) and POST (body).
   * Pesapal sends GET: ?OrderTrackingId=...&OrderMerchantReference=...&OrderNotificationType=IPNCHANGE
   * Must respond with JSON: {orderNotificationType,orderTrackingId,orderMerchantReference,status:200}
   */
  @Public()
  @Get('ipn')
  @ApiOperation({ summary: 'Pesapal IPN GET handler' })
  async pesapalIpnGet(
    @Query('OrderTrackingId') orderTrackingId: string,
    @Query('OrderMerchantReference') orderMerchantRef: string,
    @Query('OrderNotificationType') notificationType: string,
    @Res() res: Response,
  ) {
    const logger = new Logger('PesapalIPN');
    const notifType = notificationType || 'IPNCHANGE';
    logger.log(`IPN GET received: trackingId=${orderTrackingId}, merchantRef=${orderMerchantRef}, type=${notifType}`);

    const payload = { OrderTrackingId: orderTrackingId, OrderMerchantReference: orderMerchantRef, OrderNotificationType: notifType };

    // Dedupe: Pesapal retries on non-200; we silently ack duplicates. providerEventId =
    // OrderTrackingId (Pesapal's unique transaction identifier). Security: handleCallback
    // re-fetches transaction status via OAuth-authenticated GetTransactionStatus call —
    // the IPN itself is just a notification, the truth comes from Pesapal's API.
    const evt = await this.webhookEvents.record('pesapal', orderTrackingId || '', payload);
    if (!evt.isDuplicate) {
      try {
        const result = await this.paymentsService.handleCallback('pesapal', payload);
        await this.webhookEvents.markProcessed(evt.id);
        logger.log(`IPN processed successfully for order ${orderMerchantRef}: ${JSON.stringify(result)}`);
      } catch (e: any) {
        await this.webhookEvents.markFailed(evt.id, e?.message || 'unknown');
        logger.error(`IPN processing failed for order ${orderMerchantRef}: ${e.message}`, e.stack);
      }
    } else {
      logger.log(`Duplicate IPN suppressed for trackingId=${orderTrackingId}`);
    }

    // Required Pesapal IPN acknowledgement — MUST always be 200 (otherwise they retry).
    res.status(200).json({
      orderNotificationType: notifType,
      orderTrackingId,
      orderMerchantReference: orderMerchantRef,
      status: 200,
    });
  }

  @Public()
  @Post('ipn')
  @ApiOperation({ summary: 'Pesapal IPN POST handler' })
  async pesapalIpnPost(@Body() payload: any, @Res() res: Response) {
    const logger = new Logger('PesapalIPN');
    logger.log(`IPN POST received: ${JSON.stringify(payload)}`);

    const trackingId = payload?.OrderTrackingId || '';
    const evt = await this.webhookEvents.record('pesapal', trackingId, payload);
    if (!evt.isDuplicate) {
      try {
        await this.paymentsService.handleCallback('pesapal', payload);
        await this.webhookEvents.markProcessed(evt.id);
        logger.log(`IPN POST processed for order ${payload.OrderMerchantReference}`);
      } catch (e: any) {
        await this.webhookEvents.markFailed(evt.id, e?.message || 'unknown');
        logger.error(`IPN POST failed: ${e.message}`, e.stack);
      }
    } else {
      logger.log(`Duplicate IPN POST suppressed for trackingId=${trackingId}`);
    }

    res.status(200).json({
      orderNotificationType: payload.OrderNotificationType || 'IPNCHANGE',
      orderTrackingId: payload.OrderTrackingId,
      orderMerchantReference: payload.OrderMerchantReference,
      status: 200,
    });
  }

  /**
   * Mobile payment return — Pesapal redirects here after payment (HTTPS required).
   * Confirms payment status and serves an HTML page that bounces back into the app
   * via the totalstore:// custom URI scheme, which the in-app WebView intercepts.
   * Public endpoint — no JWT required (called by Pesapal browser redirect).
   */
  @Public()
  @Get('mobile-return')
  @ApiOperation({ summary: 'Mobile payment return — redirects back to app via deep link' })
  async mobileReturn(
    @Query('orderId') orderId: string,
    @Query('OrderTrackingId') orderTrackingId: string,
    @Query('OrderMerchantReference') orderMerchantRef: string,
    @Res() res: Response,
  ) {
    const logger = new Logger('MobileReturn');
    const resolvedOrderId = orderId || orderMerchantRef;
    logger.log(`Mobile return: orderId=${resolvedOrderId}, trackingId=${orderTrackingId}`);

    let paymentSuccess = false;

    if (resolvedOrderId) {
      try {
        const result = await this.paymentsService.confirmPayment(resolvedOrderId);
        paymentSuccess = result?.status === 'COMPLETED' || result?.success === true;
        logger.log(`Payment confirmed for order ${resolvedOrderId}: success=${paymentSuccess}`);
      } catch (e: any) {
        logger.warn(`Payment confirmation failed for order ${resolvedOrderId}: ${e.message}`);
      }
    }

    const status = paymentSuccess ? 'success' : 'pending';
    const deepLink = `totalstore://payment-complete/${resolvedOrderId || 'unknown'}?status=${status}&trackingId=${orderTrackingId || ''}`;

    // Serve HTML that immediately bounces into the mobile app
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="1;url=${deepLink}">
  <title>Payment ${paymentSuccess ? 'Successful' : 'Processing'}</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center;
           align-items: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
    .card { text-align: center; padding: 32px; background: white; border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 320px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; color: #1a1a2e; }
    p { color: #6b7280; margin: 0 0 24px; }
    a { display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
        border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${paymentSuccess ? '✅' : '⏳'}</div>
    <h2>Payment ${paymentSuccess ? 'Successful' : 'Processing'}</h2>
    <p>Returning you to the app...</p>
    <a href="${deepLink}">Back to App</a>
  </div>
  <script>
    (function() {
      try { window.location.href = '${deepLink}'; } catch(e) {}
      setTimeout(function() {
        try { window.location.href = '${deepLink}'; } catch(e) {}
      }, 500);
    })();
  </script>
</body>
</html>`);
  }
}
