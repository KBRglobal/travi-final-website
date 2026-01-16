-- Migration: Add 12 Dubai/UAE focused locales
-- This migration adds the new locale enum values

-- 🔴 TIER 1 - Core Markets (en, ar, hi already exist in original)
-- These should already exist from previous setup

-- 🟡 TIER 2 - High ROI Markets
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'ur';   -- Urdu (Pakistan)
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'ru';   -- Russian
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'fa';   -- Persian/Farsi
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'zh';   -- Chinese

-- 🟢 TIER 3 - European Niche Markets
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'fr';   -- French
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'de';   -- German
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'it';   -- Italian

-- ⚪ TIER 4 - Optional
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'es';   -- Spanish
ALTER TYPE locale ADD VALUE IF NOT EXISTS 'tr';   -- Turkish

-- Verify the enum values
-- SELECT enum_range(NULL::locale);
