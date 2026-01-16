-- Migration: Add background_jobs table for persistent job queue
-- Persists jobs to database instead of in-memory storage

-- Create job status enum
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create job type enum
DO $$ BEGIN
    CREATE TYPE job_type AS ENUM ('translate', 'ai_generate', 'email', 'image_process', 'cleanup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create background_jobs table
CREATE TABLE IF NOT EXISTS background_jobs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error TEXT,
    retries INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_jobs_status" ON background_jobs (status);
CREATE INDEX IF NOT EXISTS "IDX_jobs_type" ON background_jobs (type);
CREATE INDEX IF NOT EXISTS "IDX_jobs_priority" ON background_jobs (priority);
CREATE INDEX IF NOT EXISTS "IDX_jobs_created_at" ON background_jobs (created_at);

-- Comment for documentation
COMMENT ON TABLE background_jobs IS 'Background job queue for async processing - translation, AI generation, email sending etc.';
