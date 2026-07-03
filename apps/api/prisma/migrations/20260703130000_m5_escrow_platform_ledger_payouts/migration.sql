-- Seller escrow balance
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Generalize payouts to all wallet owner types
ALTER TABLE "payouts" ALTER COLUMN "sellerId" DROP NOT NULL;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "ownerType" TEXT NOT NULL DEFAULT 'SELLER';
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "destinationName" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
UPDATE "payouts" SET "ownerId" = "sellerId" WHERE "ownerId" IS NULL AND "sellerId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "payouts_status_createdAt_idx" ON "payouts"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "payouts_ownerType_ownerId_idx" ON "payouts"("ownerType", "ownerId");

-- Platform revenue ledger
CREATE TABLE IF NOT EXISTS "platform_ledger" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UGX',
  "orderId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_ledger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_ledger_type_createdAt_idx" ON "platform_ledger"("type", "createdAt" DESC);

-- Escrow holds
CREATE TABLE IF NOT EXISTS "escrow_holds" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'HELD',
  "releaseAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "escrow_holds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "escrow_holds_orderId_sellerId_key" ON "escrow_holds"("orderId", "sellerId");
CREATE INDEX IF NOT EXISTS "escrow_holds_status_releaseAt_idx" ON "escrow_holds"("status", "releaseAt");
