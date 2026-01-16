-- Migration: Add monetization tables for persistent premium content, purchases, business listings, and leads
-- Persists monetization data instead of in-memory storage

-- Create premium access type enum
DO $$ BEGIN
    CREATE TYPE premium_access_type AS ENUM ('one-time', 'subscription', 'membership');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create purchase status enum
DO $$ BEGIN
    CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create business status enum
DO $$ BEGIN
    CREATE TYPE business_status AS ENUM ('pending', 'active', 'expired', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lead type enum
DO $$ BEGIN
    CREATE TYPE lead_type AS ENUM ('inquiry', 'booking_request', 'quote_request', 'contact');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lead status enum
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create premium_content table
CREATE TABLE IF NOT EXISTS premium_content (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL UNIQUE,
    is_premium BOOLEAN NOT NULL DEFAULT true,
    preview_percentage INTEGER NOT NULL DEFAULT 20,
    price INTEGER NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'USD',
    access_type premium_access_type NOT NULL DEFAULT 'one-time',
    subscription_tier VARCHAR,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    revenue INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create content_purchases table
CREATE TABLE IF NOT EXISTS content_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    content_id VARCHAR NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'USD',
    status purchase_status NOT NULL DEFAULT 'pending',
    payment_intent VARCHAR,
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create business_listings table
CREATE TABLE IF NOT EXISTS business_listings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    description TEXT,
    contact_email VARCHAR NOT NULL,
    contact_phone VARCHAR,
    website VARCHAR,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    hours JSONB DEFAULT '{}',
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    logo VARCHAR,
    tier VARCHAR NOT NULL DEFAULT 'basic',
    status business_status NOT NULL DEFAULT 'pending',
    verified BOOLEAN NOT NULL DEFAULT false,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    rating DECIMAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    monthly_price INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR NOT NULL REFERENCES business_listings(id) ON DELETE CASCADE,
    content_id VARCHAR NOT NULL,
    type lead_type NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    message TEXT,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    guests INTEGER,
    budget VARCHAR,
    source VARCHAR NOT NULL,
    status lead_status NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "IDX_premium_content_id" ON premium_content (content_id);
CREATE INDEX IF NOT EXISTS "IDX_purchases_user" ON content_purchases (user_id);
CREATE INDEX IF NOT EXISTS "IDX_purchases_content" ON content_purchases (content_id);
CREATE INDEX IF NOT EXISTS "IDX_purchases_status" ON content_purchases (status);
CREATE INDEX IF NOT EXISTS "IDX_business_content" ON business_listings (content_id);
CREATE INDEX IF NOT EXISTS "IDX_business_status" ON business_listings (status);
CREATE INDEX IF NOT EXISTS "IDX_business_category" ON business_listings (category);
CREATE INDEX IF NOT EXISTS "IDX_leads_business" ON leads (business_id);
CREATE INDEX IF NOT EXISTS "IDX_leads_status" ON leads (status);

-- Comment for documentation
COMMENT ON TABLE premium_content IS 'Premium content settings and pricing for monetization';
COMMENT ON TABLE content_purchases IS 'User purchases of premium content';
COMMENT ON TABLE business_listings IS 'Business directory listings with monetization tiers';
COMMENT ON TABLE leads IS 'Leads generated from business listings';
