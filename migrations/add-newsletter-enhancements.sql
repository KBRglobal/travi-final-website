-- Add language preference and interest tags to newsletter subscribers
ALTER TABLE newsletter_subscribers 
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS interest_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emails_bounced INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS last_bounce_at TIMESTAMP;

-- Create newsletter A/B tests table
CREATE TABLE IF NOT EXISTS newsletter_ab_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR,
  name TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'subject_line',
  variant_a JSONB NOT NULL DEFAULT '{}',
  variant_b JSONB NOT NULL DEFAULT '{}',
  stats_a JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}',
  stats_b JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}',
  status TEXT DEFAULT 'draft',
  winner_id TEXT,
  test_duration_hours INTEGER DEFAULT 24,
  auto_select_winner BOOLEAN DEFAULT true,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add enhanced fields to email_templates if they don't exist
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS plain_text_content TEXT,
ADD COLUMN IF NOT EXISTS variables TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create subscriber segments table
CREATE TABLE IF NOT EXISTS subscriber_segments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]',
  subscriber_count INTEGER DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
