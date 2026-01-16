-- Migration: Add two_factor_secrets table for persistent 2FA
-- Stores TOTP secrets and backup codes in database

CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR NOT NULL,
    backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS "IDX_2fa_user" ON two_factor_secrets (user_id);

-- Comment for documentation
COMMENT ON TABLE two_factor_secrets IS 'RFC 6238 TOTP secrets for two-factor authentication';
