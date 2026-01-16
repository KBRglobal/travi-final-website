-- QA Checklist System Tables
-- Run this script to create only the QA tables without affecting other tables

-- QA Categories table
CREATE TABLE IF NOT EXISTS qa_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_he VARCHAR(255),
  description TEXT,
  description_he TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QA Checklist Items table
CREATE TABLE IF NOT EXISTS qa_checklist_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES qa_categories(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  title_he VARCHAR(500),
  description TEXT,
  description_he TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  is_automated BOOLEAN DEFAULT false,
  automation_script TEXT,
  documentation_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QA Runs table (a session of running QA checks)
CREATE TABLE IF NOT EXISTS qa_runs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  started_by INTEGER,
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QA Check Results table (results for each item in a run)
CREATE TABLE IF NOT EXISTS qa_check_results (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES qa_runs(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES qa_checklist_items(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  evidence_url TEXT,
  checked_by INTEGER,
  checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QA Templates table (pre-configured sets of checks)
CREATE TABLE IF NOT EXISTS qa_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_ids JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QA Issues table (issues found during QA)
CREATE TABLE IF NOT EXISTS qa_issues (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES qa_runs(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES qa_checklist_items(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  assigned_to INTEGER,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qa_items_category ON qa_checklist_items(category_id);
CREATE INDEX IF NOT EXISTS idx_qa_results_run ON qa_check_results(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_results_item ON qa_check_results(item_id);
CREATE INDEX IF NOT EXISTS idx_qa_issues_run ON qa_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_issues_status ON qa_issues(status);

-- Done!
SELECT 'QA Tables created successfully!' as result;
