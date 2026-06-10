-- Google product-evaluation images/graphics pulled at mining time, for use as
-- reference/B-roll assets in video generation.
-- Shape: [{ url, thumb, title, source, width, height }]
ALTER TABLE products ADD COLUMN IF NOT EXISTS "reviewImages" jsonb DEFAULT '[]'::jsonb;
