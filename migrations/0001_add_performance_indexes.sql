-- Migration: Add performance indexes
-- Date: 2026-01-16
-- Description: Add indexes on frequently queried columns for better performance

-- =============================================
-- CONTENTS TABLE INDEXES
-- =============================================

-- Index for filtering by destination
CREATE INDEX IF NOT EXISTS idx_contents_destination_id
ON contents(destination_id);

-- Index for filtering by content type
CREATE INDEX IF NOT EXISTS idx_contents_content_type
ON contents(content_type);

-- Index for filtering by status (published, draft, etc.)
CREATE INDEX IF NOT EXISTS idx_contents_status
ON contents(status);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_contents_created_at
ON contents(created_at DESC);

-- Index for looking up by slug
CREATE INDEX IF NOT EXISTS idx_contents_slug
ON contents(slug);

-- Index for filtering by language
CREATE INDEX IF NOT EXISTS idx_contents_language
ON contents(language);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_contents_dest_type_status
ON contents(destination_id, content_type, status);

-- UNIQUE scoped index: slug must be unique per destination+language
CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_slug_dest_lang_unique
ON contents(destination_id, language, slug);

-- =============================================
-- ATTRACTIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_attractions_destination_id
ON attractions(destination_id);

CREATE INDEX IF NOT EXISTS idx_attractions_content_id
ON attractions(content_id);

-- =============================================
-- HOTELS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_hotels_destination_id
ON hotels(destination_id);

CREATE INDEX IF NOT EXISTS idx_hotels_content_id
ON hotels(content_id);

-- =============================================
-- ARTICLES TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_articles_category
ON articles(category);

CREATE INDEX IF NOT EXISTS idx_articles_destination_id
ON articles(destination_id);

CREATE INDEX IF NOT EXISTS idx_articles_content_id
ON articles(content_id);

-- =============================================
-- DINING TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_dining_destination_id
ON dining(destination_id);

CREATE INDEX IF NOT EXISTS idx_dining_content_id
ON dining(content_id);

-- =============================================
-- USERS TABLE INDEXES
-- =============================================

-- UNIQUE index on email (required for login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- =============================================
-- SESSIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
ON sessions(expires_at);

-- =============================================
-- AUDIT LOGS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
ON audit_logs(entity_type);

-- =============================================
-- INTERNAL LINKS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_internal_links_source_id
ON internal_links(source_content_id);

CREATE INDEX IF NOT EXISTS idx_internal_links_target_id
ON internal_links(target_content_id);

-- =============================================
-- TRANSLATIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_translations_content_id
ON translations(content_id);

CREATE INDEX IF NOT EXISTS idx_translations_language
ON translations(language);

CREATE INDEX IF NOT EXISTS idx_translations_status
ON translations(status);

-- =============================================
-- CONTENT VIEWS TABLE INDEXES (Analytics)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_content_views_content_id
ON content_views(content_id);

CREATE INDEX IF NOT EXISTS idx_content_views_viewed_at
ON content_views(viewed_at DESC);

-- =============================================
-- NEWSLETTER SUBSCRIBERS TABLE INDEXES
-- =============================================

-- UNIQUE index on email (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_email_unique
ON newsletter_subscribers(email);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
ON newsletter_subscribers(status);

-- =============================================
-- MEDIA FILES TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_media_files_content_id
ON media_files(content_id);

CREATE INDEX IF NOT EXISTS idx_media_files_type
ON media_files(type);

-- =============================================
-- DESTINATIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_destinations_slug
ON destinations(slug);

CREATE INDEX IF NOT EXISTS idx_destinations_status
ON destinations(status);

CREATE INDEX IF NOT EXISTS idx_destinations_country
ON destinations(country);

-- =============================================
-- RSS FEEDS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rss_feeds_status
ON rss_feeds(status);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_destination_id
ON rss_feeds(destination_id);

-- =============================================
-- TOPIC BANK TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_topic_bank_status
ON topic_bank(status);

CREATE INDEX IF NOT EXISTS idx_topic_bank_destination_id
ON topic_bank(destination_id);

-- =============================================
-- KEYWORD REPOSITORY TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_keyword_repository_keyword
ON keyword_repository(keyword);

CREATE INDEX IF NOT EXISTS idx_keyword_repository_type
ON keyword_repository(type);

-- =============================================
-- CONTENT VERSIONS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_content_versions_content_id
ON content_versions(content_id);

CREATE INDEX IF NOT EXISTS idx_content_versions_created_at
ON content_versions(created_at DESC);
