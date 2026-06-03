-- M1 Webhook Events table — idempotent IPN handling + audit trail.
-- Unique (provider, providerEventId) prevents replay attacks AND duplicate processing
-- when Pesapal/MTN/Airtel retry the same IPN (which they will on 5xx or timeout).

CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id"              TEXT NOT NULL,
    "provider"        TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "signature"       TEXT,
    "payload"         JSONB NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'RECEIVED',
    "processingError" TEXT,
    "processedAt"     TIMESTAMP(3),
    "receivedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_providerEventId_key"
    ON "webhook_events"("provider", "providerEventId");

CREATE INDEX IF NOT EXISTS "webhook_events_provider_receivedAt_idx"
    ON "webhook_events"("provider", "receivedAt" DESC);
