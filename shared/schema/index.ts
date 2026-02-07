/**
 * Unified Schema Exports
 *
 * This file re-exports all schema modules for backward compatibility.
 * Import from "@shared/schema" continues to work as before.
 *
 * For new code, consider importing directly from specific modules:
 * - import { users, sessions } from "@shared/schema/auth"
 * - import { contents } from "@shared/schema/content-base"
 * - import { SUPPORTED_LOCALES } from "@shared/schema/locales"
 */

// ============================================================================
// FOUNDATION MODULES
// ============================================================================

// All enum definitions
export * from "./enums";

// Role permissions and constants
export * from "./permissions";

// Locale definitions and constants
export * from "./locales";

// TypeScript interfaces for JSONB fields
export * from "./types";

// ============================================================================
// CORE TABLE MODULES
// ============================================================================

// Authentication tables (users, sessions, tokens)
export * from "./auth";

// Base content table
export * from "./content-base";

// Content type extension tables (attractions, hotels, articles, etc.)
export * from "./content-types";

// ============================================================================
// CONTENT SUPPORT MODULES
// ============================================================================

// RSS feeds, affiliate links, media files, versions
export * from "./content-support";

// SEO tables (topic bank, keywords, analysis)
export * from "./seo";

// Localization and translation tables
export * from "./localization";

// ============================================================================
// FEATURE DOMAIN MODULES
// ============================================================================

// Analytics and tracking tables
export * from "./analytics";

// Monetization tables (premium content, business listings, leads)
export * from "./monetization";

// Newsletter and email marketing tables
export * from "./newsletter";

// Background jobs, webhooks, scheduled tasks
export * from "./jobs";

// Search queries and index
export * from "./search";

// Enterprise features (teams, workflows, notifications)
export * from "./enterprise";

// AI writers and assignments
export * from "./ai-writers";

// External integrations (social media, data exports)
export * from "./integrations";

// Destinations and category pages
export * from "./destinations";

// Answer Engine Optimization tables
export * from "./aeo";

// CMS page layouts and components
export * from "./cms-pages";

// A/B testing and QA tables
export * from "./testing";

// Media and image management
export * from "./media";

// Referral program tables
export * from "./referrals";

// Live chat and surveys
export * from "./live-features";

// Octopus V2 content engine
export * from "./octopus";

// Tags, clusters, and templates
export * from "./tags";

// Tagging intelligence and placement rules
export * from "./tagging-intelligence";

// Help center and webhook delivery
export * from "./help-webhooks";

// AI governance and cost tracking
export * from "./ai-governance";

// Metrics and dashboard configurations
export * from "./metrics-dashboard";

// Tiqets and travel integrations
export * from "./tiqets-integrations";

// Geographic and POI data
export * from "./geo-data";

// Autopilot and content exploder
export * from "./autopilot";

// Visual Asset Management System (VAMS)
export * from "./vams";

// Content rules, scores, and workflows
export * from "./content-rules";

// Editorial placements system
export * from "./editorial-placements";

// Ghost tables (existed in DB but were missing from Drizzle schema)
export * from "./ghost-tables";
