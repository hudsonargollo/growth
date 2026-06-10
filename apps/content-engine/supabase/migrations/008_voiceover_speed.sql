-- Add playback speed to voiceovers (narration rate multiplier).
-- Default 1.2× — short-form video reads too slow at 1.0×.
ALTER TABLE voiceovers ADD COLUMN IF NOT EXISTS speed numeric DEFAULT 1.2;
