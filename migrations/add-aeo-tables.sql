-- AEO (Answer Engine Optimization) Migration
-- This migration adds tables and fields for AI platform optimization

-- Create enums for AEO
DO $$ BEGIN
    CREATE TYPE aeo_platform AS ENUM ('chatgpt', 'perplexity', 'google_aio', 'claude', 'bing_chat', 'gemini');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE aeo_citation_type AS ENUM ('direct', 'paraphrase', 'reference', 'recommendation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE aeo_content_format AS ENUM (
        'comparison',
        'best_time',
        'cost_guide',
        'faq_hub',
        'top_list',
        'how_to',
        'vs_guide',
        'complete_guide'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add AEO fields to contents table
ALTER TABLE contents ADD COLUMN IF NOT EXISTS answer_capsule TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS aeo_score INTEGER;

-- Add answer_capsule field to translations table
ALTER TABLE translations ADD COLUMN IF NOT EXISTS answer_capsule TEXT;

-- Create AEO Answer Capsules table
CREATE TABLE IF NOT EXISTS aeo_answer_capsules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    locale VARCHAR NOT NULL DEFAULT 'en',
    capsule_text TEXT NOT NULL,
    capsule_html TEXT,
    key_facts JSONB DEFAULT '[]'::jsonb,
    quick_answer TEXT,
    differentiator TEXT,
    last_query TEXT,
    quality_score INTEGER,
    citation_count INTEGER DEFAULT 0,
    generated_by_ai BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    approved_by VARCHAR REFERENCES users(id),
    approved_at TIMESTAMP,
    generated_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index for content+locale combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_aeo_capsules_content_locale ON aeo_answer_capsules(content_id, locale);
CREATE INDEX IF NOT EXISTS idx_aeo_capsules_quality ON aeo_answer_capsules(quality_score);
CREATE INDEX IF NOT EXISTS idx_aeo_capsules_citations ON aeo_answer_capsules(citation_count);

-- Create AEO Citations table
CREATE TABLE IF NOT EXISTS aeo_citations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    platform aeo_platform NOT NULL,
    query TEXT NOT NULL,
    citation_type aeo_citation_type NOT NULL,
    cited_text TEXT,
    response_context TEXT,
    url TEXT,
    position INTEGER,
    competitors_cited JSONB DEFAULT '[]'::jsonb,
    session_id VARCHAR,
    user_agent TEXT,
    ip_country VARCHAR(2),
    detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aeo_citations_content ON aeo_citations(content_id);
CREATE INDEX IF NOT EXISTS idx_aeo_citations_platform ON aeo_citations(platform);
CREATE INDEX IF NOT EXISTS idx_aeo_citations_detected ON aeo_citations(detected_at);
CREATE INDEX IF NOT EXISTS idx_aeo_citations_platform_date ON aeo_citations(platform, detected_at);

-- Create AEO Performance Metrics table
CREATE TABLE IF NOT EXISTS aeo_performance_metrics (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP NOT NULL,
    platform aeo_platform NOT NULL,
    content_id VARCHAR REFERENCES contents(id) ON DELETE SET NULL,
    content_type content_type,
    impressions INTEGER DEFAULT 0,
    citations INTEGER DEFAULT 0,
    click_throughs INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    avg_position INTEGER,
    top_queries JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aeo_metrics_date_platform_content ON aeo_performance_metrics(date, platform, content_id);
CREATE INDEX IF NOT EXISTS idx_aeo_metrics_date ON aeo_performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_aeo_metrics_platform ON aeo_performance_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_aeo_metrics_content ON aeo_performance_metrics(content_id);

-- Create AEO Crawler Logs table
CREATE TABLE IF NOT EXISTS aeo_crawler_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler VARCHAR NOT NULL,
    user_agent TEXT NOT NULL,
    request_path TEXT NOT NULL,
    content_id VARCHAR REFERENCES contents(id) ON DELETE SET NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER,
    bytes_served INTEGER,
    ip_address VARCHAR,
    referer TEXT,
    crawled_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aeo_crawler_crawler ON aeo_crawler_logs(crawler);
CREATE INDEX IF NOT EXISTS idx_aeo_crawler_date ON aeo_crawler_logs(crawled_at);
CREATE INDEX IF NOT EXISTS idx_aeo_crawler_path ON aeo_crawler_logs(request_path);

-- Create AEO Programmatic Content table
CREATE TABLE IF NOT EXISTS aeo_programmatic_content (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    format aeo_content_format NOT NULL,
    template_name VARCHAR NOT NULL,
    template_pattern TEXT NOT NULL,
    variables JSONB DEFAULT '{}'::jsonb,
    generated_content_ids JSONB DEFAULT '[]'::jsonb,
    target_count INTEGER DEFAULT 0,
    generated_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    last_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create AEO A/B Tests table
CREATE TABLE IF NOT EXISTS aeo_ab_tests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    content_id VARCHAR NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    variants JSONB DEFAULT '[]'::jsonb,
    winning_variant_id VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    min_sample_size INTEGER DEFAULT 100,
    confidence_level INTEGER DEFAULT 95,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create AEO Schema Enhancements table
CREATE TABLE IF NOT EXISTS aeo_schema_enhancements (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    schema_type VARCHAR NOT NULL,
    schema_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    validation_status VARCHAR DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]'::jsonb,
    last_validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aeo_schema_content ON aeo_schema_enhancements(content_id);
CREATE INDEX IF NOT EXISTS idx_aeo_schema_type ON aeo_schema_enhancements(schema_type);

-- Add comments for documentation
COMMENT ON TABLE aeo_answer_capsules IS 'AI-optimized answer summaries for each content piece (40-60 words)';
COMMENT ON TABLE aeo_citations IS 'Tracks when AI platforms cite TRAVI content';
COMMENT ON TABLE aeo_performance_metrics IS 'Daily aggregate metrics for AEO performance per platform';
COMMENT ON TABLE aeo_crawler_logs IS 'Logs of AI crawler visits (GPTBot, PerplexityBot, etc.)';
COMMENT ON TABLE aeo_programmatic_content IS 'Templates for generating scalable AEO content';
COMMENT ON TABLE aeo_ab_tests IS 'A/B tests for answer capsule optimization';
COMMENT ON TABLE aeo_schema_enhancements IS 'Enhanced schema.org markup for AI consumption';
COMMENT ON COLUMN contents.answer_capsule IS 'AEO: 40-60 word summary optimized for AI extraction';
COMMENT ON COLUMN contents.aeo_score IS 'AEO optimization score (0-100)';
COMMENT ON COLUMN translations.answer_capsule IS 'AEO: Localized answer capsule for AI extraction';
