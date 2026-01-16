-- Migration to add dining and events sections to homepage_promotions
-- Add new enum values for dining and events sections
ALTER TYPE homepage_section ADD VALUE IF NOT EXISTS 'dining';
ALTER TYPE homepage_section ADD VALUE IF NOT EXISTS 'events';
