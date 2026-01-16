-- Migration: Add ab_tests table for persistent A/B testing
-- Persists A/B test data instead of in-memory storage

-- Create status enum
DO $$ BEGIN
    CREATE TYPE ab_test_status AS ENUM ('running', 'completed', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create test type enum
DO $$ BEGIN
    CREATE TYPE ab_test_type AS ENUM ('title', 'heroImage', 'metaDescription');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ab_tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL,
    test_type ab_test_type NOT NULL,
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    status ab_test_status NOT NULL DEFAULT 'running',
    winner VARCHAR,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_ab_tests_content" ON ab_tests (content_id);
CREATE INDEX IF NOT EXISTS "IDX_ab_tests_status" ON ab_tests (status);

-- Comment for documentation
COMMENT ON TABLE ab_tests IS 'A/B testing for content optimization - titles, hero images, meta descriptions';
