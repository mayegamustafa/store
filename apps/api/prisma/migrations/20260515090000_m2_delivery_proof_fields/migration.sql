-- M2: Delivery proof provenance fields.
-- proofGeo captures lat/lng/accuracy at the moment the rider submitted proof —
-- used to verify the rider was at the dropoff location (anti-fraud).
-- proofAt is the server-side timestamp the proof was accepted (not the photo EXIF).

ALTER TABLE "deliveries"
    ADD COLUMN IF NOT EXISTS "proofGeo" JSONB,
    ADD COLUMN IF NOT EXISTS "proofAt"  TIMESTAMP(3);
