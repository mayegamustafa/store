-- M1 Additional Indexes — supplements 20260419000000_production_hardening_indexes
-- Adds composite indexes on FK columns Prisma does NOT auto-index, plus filter columns
-- used in hot read paths (seller's products, category browse, notification feeds,
-- admin payment monitoring, rider active deliveries).
--
-- Pattern: CREATE INDEX IF NOT EXISTS so re-running is safe.
-- For tables > 50M rows, run CREATE INDEX CONCURRENTLY manually via psql outside
-- this migration and mark the migration applied — Prisma wraps SQL in a transaction
-- which is incompatible with CONCURRENTLY.

-- Products: seller's catalog filtered by status (seller dashboard list)
CREATE INDEX IF NOT EXISTS "products_sellerId_status_idx" ON "products"("sellerId", "status");
-- Products: category browse (only APPROVED visible to buyers)
CREATE INDEX IF NOT EXISTS "products_categoryId_status_idx" ON "products"("categoryId", "status");
-- Products: homepage "new arrivals" / "approved feed"
CREATE INDEX IF NOT EXISTS "products_status_createdAt_idx" ON "products"("status", "createdAt" DESC);
-- Products: featured / sponsored ranking (partial index on flag = true)
CREATE INDEX IF NOT EXISTS "products_isFeatured_idx" ON "products"("isFeatured") WHERE "isFeatured" = true;
CREATE INDEX IF NOT EXISTS "products_isSponsored_idx" ON "products"("isSponsored") WHERE "isSponsored" = true;

-- OrderItems: analytics by product
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");
-- OrderItems: seller's items by recency (seller revenue queries)
CREATE INDEX IF NOT EXISTS "order_items_sellerId_createdAt_idx" ON "order_items"("sellerId", "createdAt" DESC);

-- Notifications: user feed (unread/recent)
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);
-- Notifications: unread badge count (partial index = small + fast)
CREATE INDEX IF NOT EXISTS "notifications_userId_unread_idx" ON "notifications"("userId") WHERE "isRead" = false;

-- Payments: admin monitoring (filter by status, sort by recency)
CREATE INDEX IF NOT EXISTS "payments_status_createdAt_idx" ON "payments"("status", "createdAt" DESC);
-- Payments: provider lookups for reconciliation / IPN replay
CREATE INDEX IF NOT EXISTS "payments_providerRef_idx" ON "payments"("providerRef") WHERE "providerRef" IS NOT NULL;

-- Deliveries: rider's active deliveries (online rider home screen)
CREATE INDEX IF NOT EXISTS "deliveries_riderId_status_idx" ON "deliveries"("riderId", "status");
-- Deliveries: status board (admin fleet & dispatch)
CREATE INDEX IF NOT EXISTS "deliveries_status_createdAt_idx" ON "deliveries"("status", "createdAt" DESC);

-- Wishlist & Cart: user's items (FK columns Prisma does not auto-index)
CREATE INDEX IF NOT EXISTS "wishlist_items_userId_idx" ON "wishlist_items"("userId");
CREATE INDEX IF NOT EXISTS "cart_items_cartId_idx" ON "cart_items"("cartId");

-- Reviews: seller's review feed (seller dashboard) — relies on review.userId for "reviews by user"
CREATE INDEX IF NOT EXISTS "reviews_userId_createdAt_idx" ON "reviews"("userId", "createdAt" DESC);
