-- M3b.3: SubscriptionAuditLog — immutable audit trail for admin actions
-- (extend, cancel, manual activation, status override) on seller subscriptions.

CREATE TABLE IF NOT EXISTS "subscription_audit_logs" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "action"         TEXT NOT NULL,
    "actorUserId"    TEXT NOT NULL,
    "payload"        JSONB NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_audit_logs_subscriptionId_createdAt_idx"
    ON "subscription_audit_logs"("subscriptionId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "subscription_audit_logs_actorUserId_createdAt_idx"
    ON "subscription_audit_logs"("actorUserId", "createdAt" DESC);

ALTER TABLE "subscription_audit_logs"
    ADD CONSTRAINT "subscription_audit_logs_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "seller_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_audit_logs"
    ADD CONSTRAINT "subscription_audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
