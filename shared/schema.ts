/**
 * Schema Re-export for Backward Compatibility
 *
 * This file re-exports all schema definitions from the modular structure.
 * The schema has been split into domain-specific modules under ./schema/
 *
 * For new code, consider importing directly from specific modules:
 * @example
 * import { users, sessions } from "@shared/schema/auth"
 * import { contents } from "@shared/schema/content-base"
 * import { SUPPORTED_LOCALES } from "@shared/schema/locales"
 *
 * Module structure:
 * - schema/enums.ts          - All pgEnum definitions
 * - schema/permissions.ts    - Role permissions
 * - schema/locales.ts        - Locale constants
 * - schema/types.ts          - TypeScript interfaces
 * - schema/auth.ts           - Authentication tables
 * - schema/content-base.ts   - Base content table
 * - schema/content-types.ts  - Content type extensions
 * - schema/content-support.ts - RSS, affiliates, media
 * - schema/seo.ts            - SEO tables
 * - schema/localization.ts   - Translations
 * - schema/analytics.ts      - Analytics tracking
 * - schema/monetization.ts   - Payments, business listings
 * - schema/newsletter.ts     - Email marketing
 * - schema/jobs.ts           - Background jobs, webhooks
 * - schema/search.ts         - Search index
 * - schema/enterprise.ts     - Teams, workflows
 * - schema/ai-writers.ts     - AI writer personalities
 * - schema/integrations.ts   - External integrations
 * - schema/destinations.ts   - Destination pages
 * - schema/aeo.ts            - Answer Engine Optimization
 * - schema/cms-pages.ts      - CMS page layouts
 * - schema/testing.ts        - A/B tests, QA
 * - schema/media.ts          - Image management
 * - schema/referrals.ts      - Referral program
 * - schema/live-features.ts  - Chat, surveys
 * - schema/octopus.ts        - Octopus content engine
 * - schema/tags.ts           - Tags and clusters
 * - schema/tagging-intelligence.ts - Placement rules
 * - schema/help-webhooks.ts  - Help center, webhook delivery
 * - schema/ai-governance.ts  - AI cost tracking, governance
 * - schema/metrics-dashboard.ts - Metrics, dashboards
 * - schema/tiqets-integrations.ts - Tiqets, travel data
 * - schema/geo-data.ts       - Geographic POI data
 * - schema/autopilot.ts      - Autopilot system
 * - schema/vams.ts           - Visual Asset Management
 */

export * from "./schema/index";
