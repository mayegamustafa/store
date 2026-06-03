-- Production Hardening: Add missing indexes, fix cascades

-- RefreshToken indexes
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- OtpCode indexes
CREATE INDEX IF NOT EXISTS "otp_codes_userId_idx" ON "otp_codes"("userId");
CREATE INDEX IF NOT EXISTS "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");

-- Address index
CREATE INDEX IF NOT EXISTS "addresses_userId_idx" ON "addresses"("userId");

-- RiderLocationLog composite index
CREATE INDEX IF NOT EXISTS "rider_location_logs_riderId_createdAt_idx" ON "rider_location_logs"("riderId", "createdAt" DESC);

-- ProductVariant index
CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON "product_variants"("productId");

-- OrderStatusHistory composite index
CREATE INDEX IF NOT EXISTS "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

-- Order: improve buyerId index to composite, add paymentStatus index
DROP INDEX IF EXISTS "orders_buyerId_idx";
CREATE INDEX IF NOT EXISTS "orders_buyerId_createdAt_idx" ON "orders"("buyerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- SellerWalletTransaction composite index
CREATE INDEX IF NOT EXISTS "seller_wallet_transactions_sellerId_createdAt_idx" ON "seller_wallet_transactions"("sellerId", "createdAt" DESC);

-- RiderWalletTransaction composite index
CREATE INDEX IF NOT EXISTS "rider_wallet_transactions_riderId_createdAt_idx" ON "rider_wallet_transactions"("riderId", "createdAt" DESC);

-- Review index for product feed
CREATE INDEX IF NOT EXISTS "reviews_productId_createdAt_idx" ON "reviews"("productId", "createdAt" DESC);

-- FlashSaleItem indexes
CREATE INDEX IF NOT EXISTS "flash_sale_items_flashSaleId_idx" ON "flash_sale_items"("flashSaleId");
CREATE INDEX IF NOT EXISTS "flash_sale_items_productId_idx" ON "flash_sale_items"("productId");

-- ReturnRequest indexes
CREATE INDEX IF NOT EXISTS "return_requests_orderId_idx" ON "return_requests"("orderId");
CREATE INDEX IF NOT EXISTS "return_requests_status_idx" ON "return_requests"("status");

-- NotificationLog index
CREATE INDEX IF NOT EXISTS "notification_logs_event_sentAt_idx" ON "notification_logs"("event", "sentAt" DESC);

-- DeliveryStatusLog: upgrade to composite
DROP INDEX IF EXISTS "delivery_status_logs_deliveryId_idx";
CREATE INDEX IF NOT EXISTS "delivery_status_logs_deliveryId_createdAt_idx" ON "delivery_status_logs"("deliveryId", "createdAt" DESC);

-- Fix Delivery.rider cascade: set null on rider deletion
ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_riderId_fkey";
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_riderId_fkey"
  FOREIGN KEY ("riderId") REFERENCES "rider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
