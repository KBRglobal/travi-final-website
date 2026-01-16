-- Migration: Add AI Writers fields to contents table
-- This migration adds fields to track AI-generated content with writer attribution

-- Add writer fields to contents table
ALTER TABLE contents
ADD COLUMN IF NOT EXISTS writer_id VARCHAR,
ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS writer_voice_score INTEGER;

-- Add index for writer lookups
CREATE INDEX IF NOT EXISTS IDX_contents_writer ON contents(writer_id);

-- Add comment to explain the fields
COMMENT ON COLUMN contents.writer_id IS 'References ai_writers.id - the AI writer who generated this content';
COMMENT ON COLUMN contents.generated_by_ai IS 'Whether this content was generated using AI Writers system';
COMMENT ON COLUMN contents.writer_voice_score IS 'Voice consistency score (0-100) indicating how well content matches the writer''s voice';
