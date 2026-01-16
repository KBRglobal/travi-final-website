-- Migration: Add push_subscriptions table for PWA notifications
-- Persists push notification subscriptions to database

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    locale VARCHAR NOT NULL DEFAULT 'en',
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_push_user" ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS "IDX_push_locale" ON push_subscriptions (locale);

-- Comment for documentation
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for PWA';
