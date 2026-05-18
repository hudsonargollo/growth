-- Add provider column to voiceovers (openai | elevenlabs)
ALTER TABLE voiceovers ADD COLUMN IF NOT EXISTS provider text DEFAULT 'elevenlabs';
-- Store the full script text snapshot used (avoids re-fetching)
ALTER TABLE voiceovers ADD COLUMN IF NOT EXISTS charCount integer DEFAULT 0;
