-- Referral/Affiliate Program System Migration

-- Referral status enum
DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'converted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Commission status enum
DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR,
  description TEXT,
  commission_rate INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);

-- Referral clicks table
CREATE TABLE IF NOT EXISTS referral_clicks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id VARCHAR NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  ip_address VARCHAR,
  user_agent TEXT,
  referer TEXT,
  landing_page TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created ON referral_clicks(created_at);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id VARCHAR NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  subscriber_id VARCHAR REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  email VARCHAR,
  status referral_status NOT NULL DEFAULT 'pending',
  ip_address VARCHAR,
  user_agent TEXT,
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_subscriber ON referrals(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at);

-- Referral commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id VARCHAR NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referral_id VARCHAR REFERENCES referrals(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  status commission_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_code ON referral_commissions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referral ON referral_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON referral_commissions(status);
