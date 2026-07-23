-- Product branding + condition
-- brand: free-text manufacturer/brand name shown on listings and product pages
-- condition: NEW | USED | REFURBISHED (null = unspecified)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "condition" TEXT;
