-- Channel profile (one per workspace / user)
CREATE TABLE IF NOT EXISTS channel_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelName"   text NOT NULL DEFAULT '',
  niche           text DEFAULT '',
  "platformFocus" text DEFAULT 'youtube',
  "targetAudience" text DEFAULT '',
  tone            text DEFAULT 'energético e informativo',
  "affiliatePlatforms" text[] DEFAULT ARRAY['amazon_brasil', 'mercadolivre'],
  "ctaStyle"      text DEFAULT 'links na descrição',
  "signaturePhrases" text DEFAULT '',
  "introStyle"    text DEFAULT 'hook_question',
  "createdAt"     timestamptz DEFAULT now(),
  "updatedAt"     timestamptz DEFAULT now()
);

-- Visual blueprints (templates the user builds)
CREATE TABLE IF NOT EXISTS blueprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text DEFAULT '',
  sections    jsonb NOT NULL DEFAULT '[]',
  "isDefault" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Extend scripts table with structured sections + metadata
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]';
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS title text DEFAULT '';
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "channelProfileId" uuid REFERENCES channel_profiles(id) ON DELETE SET NULL;

-- Seed one default blueprint
INSERT INTO blueprints (id, name, description, sections, "isDefault")
VALUES (
  gen_random_uuid(),
  'Top 5 Custo-Benefício',
  'Formato padrão do canal: abertura + 5 produtos + CTA',
  '[
    {"id":"s1","type":"intro","label":"Abertura","duration":60,"instructions":"Gancho forte + problema que o produto resolve"},
    {"id":"s2","type":"product","label":"Produto #5","duration":90,"instructions":"Pior custo-benefício da lista, cria contraste"},
    {"id":"s3","type":"product","label":"Produto #4","duration":90,"instructions":""},
    {"id":"s4","type":"product","label":"Produto #3","duration":120,"instructions":""},
    {"id":"s5","type":"product","label":"Produto #2","duration":120,"instructions":""},
    {"id":"s6","type":"product","label":"Produto #1","duration":150,"instructions":"Melhor custo-benefício — destaque especial"},
    {"id":"s7","type":"cta","label":"CTA Final","duration":45,"instructions":"Links na descrição + inscrição + notificação"}
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
