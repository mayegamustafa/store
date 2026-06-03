-- M3a: Subscription GRACE period + reminder tracking.
-- All operations additive (zero-downtime safe).

-- 1. Grace period column on existing SellerSubscription
ALTER TABLE "seller_subscriptions"
    ADD COLUMN IF NOT EXISTS "graceUntil" TIMESTAMP(3);

-- 2. Index for cron query: "find ACTIVE subs whose expiresAt has passed"
CREATE INDEX IF NOT EXISTS "seller_subscriptions_status_expiresAt_idx"
    ON "seller_subscriptions"("status", "expiresAt");

-- 3. SubscriptionReminder dedup table — prevents duplicate -7d/-3d/-1d emails when
--    the cron runs twice within a bucket window.
CREATE TABLE IF NOT EXISTS "subscription_reminders" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "bucket"         TEXT NOT NULL,
    "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_reminders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_reminders_subscriptionId_fkey"
        FOREIGN KEY ("subscriptionId") REFERENCES "seller_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_reminders_subscriptionId_bucket_key"
    ON "subscription_reminders"("subscriptionId", "bucket");
