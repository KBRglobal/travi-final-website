-- Create AI Writers tables

-- Create enums for writer assignments
CREATE TYPE writer_assignment_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'published');
CREATE TYPE writer_assignment_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- AI Writers table
CREATE TABLE IF NOT EXISTS ai_writers (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  avatar TEXT,
  nationality TEXT,
  age INTEGER,
  expertise TEXT[],
  personality TEXT,
  writing_style TEXT,
  voice_characteristics JSONB DEFAULT '[]',
  sample_phrases TEXT[],
  bio TEXT,
  short_bio TEXT,
  social_media JSONB,
  content_types TEXT[],
  languages TEXT[],
  is_active BOOLEAN DEFAULT true,
  article_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for ai_writers
CREATE INDEX IF NOT EXISTS IDX_ai_writers_slug ON ai_writers(slug);
CREATE INDEX IF NOT EXISTS IDX_ai_writers_active ON ai_writers(is_active);

-- Writer Assignments table
CREATE TABLE IF NOT EXISTS writer_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id VARCHAR REFERENCES ai_writers(id),
  content_id VARCHAR REFERENCES contents(id),
  content_type TEXT,
  topic TEXT,
  status writer_assignment_status DEFAULT 'pending',
  match_score INTEGER,
  priority writer_assignment_priority DEFAULT 'normal',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for writer_assignments
CREATE INDEX IF NOT EXISTS IDX_writer_assignments_writer ON writer_assignments(writer_id);
CREATE INDEX IF NOT EXISTS IDX_writer_assignments_content ON writer_assignments(content_id);
CREATE INDEX IF NOT EXISTS IDX_writer_assignments_status ON writer_assignments(status);

-- Writer Performance table
CREATE TABLE IF NOT EXISTS writer_performance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id VARCHAR REFERENCES ai_writers(id),
  period VARCHAR,
  articles_written INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_engagement INTEGER,
  avg_seo_score INTEGER,
  avg_voice_score INTEGER,
  top_performing_article VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for writer_performance
CREATE INDEX IF NOT EXISTS IDX_writer_performance_writer ON writer_performance(writer_id);
CREATE INDEX IF NOT EXISTS IDX_writer_performance_period ON writer_performance(period);
