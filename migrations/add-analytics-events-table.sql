-- Migration: Add analytics_events table for customer journey tracking
-- Persists analytics events to database instead of in-memory

-- Create event type enum
DO $$ BEGIN
    CREATE TYPE analytics_event_type AS ENUM (
        'page_view', 'click', 'scroll', 'form_start', 'form_submit', 'form_abandon',
        'cta_click', 'outbound_link', 'search', 'filter', 'share', 'video_play',
        'video_complete', 'download', 'copy', 'print', 'add_to_favorites',
        'exit_intent', 'conversion', 'engagement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR NOT NULL,
    visitor_id VARCHAR NOT NULL,
    event_type analytics_event_type NOT NULL,
    event_name VARCHAR,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    page_url TEXT,
    page_path VARCHAR,
    page_title VARCHAR,
    referrer TEXT,
    -- Element details
    element_id VARCHAR,
    element_class VARCHAR,
    element_text TEXT,
    element_href TEXT,
    -- Position data
    scroll_depth INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    click_x INTEGER,
    click_y INTEGER,
    -- Session data
    time_on_page INTEGER,
    page_load_time INTEGER,
    is_new_session BOOLEAN,
    is_new_visitor BOOLEAN,
    -- User context
    user_agent TEXT,
    device_type VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    language VARCHAR,
    country VARCHAR,
    city VARCHAR,
    -- Content context
    content_id VARCHAR,
    content_type VARCHAR,
    content_title VARCHAR,
    -- UTM parameters
    utm_source VARCHAR,
    utm_medium VARCHAR,
    utm_campaign VARCHAR,
    utm_term VARCHAR,
    utm_content VARCHAR,
    -- Custom data
    metadata JSONB
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_analytics_session" ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS "IDX_analytics_visitor" ON analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS "IDX_analytics_timestamp" ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS "IDX_analytics_event_type" ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS "IDX_analytics_page_path" ON analytics_events (page_path);

-- Comment for documentation
COMMENT ON TABLE analytics_events IS 'Customer journey analytics events - page views, clicks, conversions etc.';
