-- Migration: Update newsletter tables with additional fields
-- Adds missing columns and creates automated_sequences table

-- Add missing columns to newsletter_subscribers
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS locale VARCHAR DEFAULT 'en';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"frequency": "weekly", "categories": []}'::jsonb;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMP;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS emails_received INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS emails_opened INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS emails_clicked INTEGER DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add Hebrew content fields to newsletter_campaigns
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS subject_he VARCHAR;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS preview_text_he VARCHAR;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS html_content_he TEXT;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS target_tags JSONB;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS target_locales JSONB;

-- Create sequence trigger enum
DO $$ BEGIN
    CREATE TYPE sequence_trigger AS ENUM ('signup', 'tag_added', 'inactivity', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create automated_sequences table
CREATE TABLE IF NOT EXISTS automated_sequences (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    trigger sequence_trigger NOT NULL,
    trigger_value VARCHAR,
    emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS "IDX_sequences_trigger" ON automated_sequences (trigger);
CREATE INDEX IF NOT EXISTS "IDX_sequences_active" ON automated_sequences (is_active);

-- Comment for documentation
COMMENT ON TABLE automated_sequences IS 'Automated email sequences triggered by subscriber actions';
