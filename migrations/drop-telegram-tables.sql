-- Migration: Remove unused Telegram tables
-- These tables were part of archived Telegram bot functionality that is no longer used
-- Using CASCADE to handle any foreign key constraints

DROP TABLE IF EXISTS telegram_conversations CASCADE;
DROP TABLE IF EXISTS telegram_user_profiles CASCADE;
