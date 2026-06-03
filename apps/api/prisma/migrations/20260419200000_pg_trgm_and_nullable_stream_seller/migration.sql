-- Enable pg_trgm for fuzzy product search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on product name for fast similarity queries
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Make sellerId nullable on live_streams (admin-created platform streams)
ALTER TABLE "live_streams" ALTER COLUMN "sellerId" DROP NOT NULL;
