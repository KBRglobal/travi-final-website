-- Migration: Add pgvector extension and search_index table
-- Run this on your PostgreSQL database

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create search_index table
CREATE TABLE IF NOT EXISTS search_index (
  content_id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL,
  meta_description TEXT,
  searchable_text TEXT,
  url VARCHAR NOT NULL,
  image VARCHAR,
  locale VARCHAR NOT NULL DEFAULT 'en',
  tags TEXT,
  embedding vector(1536), -- OpenAI text-embedding-3-small (1536 dimensions)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for fast searching

-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_search_content_type 
ON search_index (content_type);

-- Index for locale filtering
CREATE INDEX IF NOT EXISTS idx_search_locale 
ON search_index (locale);

-- Index for updated_at sorting
CREATE INDEX IF NOT EXISTS idx_search_updated 
ON search_index (updated_at);

-- Full-text search index on searchable_text
CREATE INDEX IF NOT EXISTS idx_search_fulltext 
ON search_index 
USING GIN (to_tsvector('english', searchable_text));

-- Vector similarity search index using IVFFlat
-- This significantly speeds up similarity searches
-- lists parameter: Number of centroids for IVFFlat clustering
--   Recommended values based on data size:
--   - 100 for <100,000 rows (good for most use cases)
--   - 1,000 for ~1,000,000 rows
--   - sqrt(total_rows) is a good rule of thumb
--   - Adjust after deployment based on query performance
CREATE INDEX IF NOT EXISTS idx_search_embedding 
ON search_index 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Composite index for filtered similarity search
CREATE INDEX IF NOT EXISTS idx_search_type_locale 
ON search_index (content_type, locale);

-- Comment on table
COMMENT ON TABLE search_index IS 'Full-text and semantic search index with vector embeddings';
COMMENT ON COLUMN search_index.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN search_index.searchable_text IS 'Searchable content extracted from blocks';
