CREATE TABLE IF NOT EXISTS short_links (
  id          text PRIMARY KEY,
  code        text UNIQUE NOT NULL,
  originalUrl text NOT NULL,
  productId   text,
  marketplace text,
  clicks      integer NOT NULL DEFAULT 0,
  createdAt   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS short_links_code_idx ON short_links(code);

-- Atomic click increment used by the redirect endpoint
CREATE OR REPLACE FUNCTION increment_short_link_clicks(link_code text)
RETURNS void LANGUAGE sql AS $$
  UPDATE short_links SET clicks = clicks + 1 WHERE code = link_code;
$$;
