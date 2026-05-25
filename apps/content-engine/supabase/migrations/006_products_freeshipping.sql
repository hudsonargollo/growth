-- Add freeShipping column missed from migration 005
ALTER TABLE products ADD COLUMN IF NOT EXISTS "freeShipping" boolean DEFAULT false;
