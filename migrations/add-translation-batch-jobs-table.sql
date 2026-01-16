-- Migration: Add translation_batch_jobs table for persistent batch translation jobs
-- Persists OpenAI batch translation jobs to database instead of in-memory storage

-- Create translation_batch_jobs table
CREATE TABLE IF NOT EXISTS translation_batch_jobs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR NOT NULL DEFAULT 'pending',
    batch_id VARCHAR,  -- OpenAI batch ID
    requests JSONB NOT NULL DEFAULT '[]'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_batch_status" ON translation_batch_jobs (status);
CREATE INDEX IF NOT EXISTS "IDX_batch_created" ON translation_batch_jobs (created_at);

-- Comment for documentation
COMMENT ON TABLE translation_batch_jobs IS 'OpenAI batch translation jobs - persisted for 24h processing window';
