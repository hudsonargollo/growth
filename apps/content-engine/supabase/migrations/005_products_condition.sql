-- Add missing columns to the products table that were present in the service
-- but absent from the DB, causing "Could not find the condition column" errors.

-- item condition (e.g. 'new', 'used') — from MercadoLivre & SerpAPI
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new';

-- original price before discount (ML direct API)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "originalPrice" numeric(12,2);

-- discount percentage computed at fetch time
ALTER TABLE products ADD COLUMN IF NOT EXISTS "discountPct" integer DEFAULT 0;

-- sold_quantity from ML direct API (also stored in "reviews" for back-compat)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "soldQuantity" integer DEFAULT 0;

-- ML listing tier (gold_pro, gold_special, gold, silver, bronze, free)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "listingType" text;

-- ML seller reputation level (5_green … 1_red)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "sellerLevel" text;

-- whether logistics is handled by ML Fulfillment
ALTER TABLE products ADD COLUMN IF NOT EXISTS fulfillment boolean DEFAULT false;

-- whether sold by an official brand store
ALTER TABLE products ADD COLUMN IF NOT EXISTS "officialStore" boolean DEFAULT false;

-- whether this is a catalog listing
ALTER TABLE products ADD COLUMN IF NOT EXISTS "catalogListing" boolean DEFAULT false;

-- canonical product URL (separate from affiliate link)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "productUrl" text;

-- blog review score bonus (0–15 pts)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "blogReviewScore" integer DEFAULT 0;

-- per-marketplace affiliate links
ALTER TABLE products ADD COLUMN IF NOT EXISTS "mlAffiliateLink" text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "amazonAffiliateLink" text;
