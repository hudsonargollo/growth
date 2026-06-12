-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 — Optional commission for closers (e.g. Pedro earns a % on sales he closes).
-- 0 = no commission (default). When > 0, a 'closer' commission row is generated
-- alongside house + partner on each sale.
-- Apply remote: wrangler d1 execute CI_DB --remote --file=./migrations/0005_closer_commission.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE closers ADD COLUMN commission_rate REAL NOT NULL DEFAULT 0;
