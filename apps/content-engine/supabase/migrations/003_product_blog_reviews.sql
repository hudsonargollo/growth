-- Add blogReviews column to products for storing top organic review snippets
ALTER TABLE products ADD COLUMN IF NOT EXISTS "blogReviews" jsonb DEFAULT '[]'::jsonb;
