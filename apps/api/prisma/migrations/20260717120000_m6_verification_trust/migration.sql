-- Rider KYC + trust
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT;
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "faceVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "faceVerifiedAt" TIMESTAMP(3);
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "infoRequested" TEXT;
ALTER TABLE "rider_profiles" ADD COLUMN IF NOT EXISTS "infoRequestedAt" TIMESTAMP(3);

-- Seller trust
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "faceVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "faceVerifiedAt" TIMESTAMP(3);
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "infoRequested" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "infoRequestedAt" TIMESTAMP(3);
