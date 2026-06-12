-- Users + custom auth for the Código Internacional CRM / partner portal.
-- Only these pre-seeded emails may register; first access sets the password.

CREATE TABLE IF NOT EXISTS users (
  email           TEXT PRIMARY KEY,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'partner',  -- admin | partner
  beneficiary_key TEXT,                              -- maps to commissions.beneficiary_key (portal scope)
  password_hash   TEXT,
  salt            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login      TEXT
);

INSERT OR IGNORE INTO users (email, name, role, beneficiary_key) VALUES
  ('hudson@tektone.com.br',          'Hudson',            'admin',   'hudson'),
  ('pedrosilvestrini@tektone.com.br','Pedro Silvestrini', 'admin',   NULL),
  ('alison@tektone.com.br',          'Alison',            'partner', 'alison'),
  ('wanderson@tektone.com.br',       'Wanderson',         'partner', 'wanderson'),
  ('andressa@tektone.com.br',        'Andressa',          'partner', 'andressa');
