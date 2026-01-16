-- Migration: Add rate_limits table for persistent rate limiting
-- This enables AI daily usage limits to persist across server restarts

CREATE TABLE IF NOT EXISTS rate_limits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS "IDX_rate_limits_key" ON rate_limits (key);
CREATE INDEX IF NOT EXISTS "IDX_rate_limits_reset" ON rate_limits (reset_at);

-- Comment for documentation
COMMENT ON TABLE rate_limits IS 'Persistent rate limiting for long-term limits like AI daily usage';
