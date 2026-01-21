# Travi CMS - Dubai Travel Content Management System

## Overview
Travi CMS is a content management system for Dubai Travel, designed to manage travel content like attractions, hotels, and articles from RSS feeds. Its core purpose is SEO optimization, seamless affiliate link integration, and a draft-first content workflow. The system aims to be a user-friendly, multi-language platform with tools for social media marketing, offering a "Discover Dubai Like a Local" experience. It focuses on advanced content generation to capitalize on the travel content market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
- **Monorepo Structure**: React frontend (Vite), Express backend, PostgreSQL database with Drizzle ORM.
- **Content Model**: Base `contents` table extended for specific types (attractions, hotels, articles) using JSONB for content blocks.
- **Workflow**: Content moves through draft, in_review, approved, scheduled, and published statuses.
- **UI/UX**: Material Design 3 / Modern Admin principles, Tailwind CSS, `shadcn/ui` with Radix primitives, supporting light/dark mode. Emphasizes opaque surfaces, a fixed blue/cyan sky gradient background, and white content cards.
- **Multi-language Support**: Supports 17 languages, including RTL, `hreflang` tags, and multi-language sitemaps.
- **SEO Focus**: Adherence to SEO best practices, including meta data, headings, linking, keyword integration, and a dedicated Dubai keyword database.
- **Admin Panel Structure**: Organized into Core Content Management, Site Configuration, Automation, Monetization, Enterprise features, and Advanced Analytics.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack React Query, `@dnd-kit/sortable`.
- **Backend**: Node.js, Express, TypeScript (ESM modules), RESTful APIs.
- **Data Layer**: PostgreSQL, Drizzle ORM with Zod validation.
- **File Uploads**: Multer integrated with Replit Object Storage.
- **AI Integration**: Unified provider system (OpenAI, Anthropic, OpenRouter, DeepSeek) with an AI Orchestrator for content generation, task routing, rate limiting, and credit monitoring. Includes AI-powered Auto Meta Generator for images using Replit AI (OpenAI Vision).
- **Security**: IDOR protection, optimistic locking, and GDPR compliance APIs.
- **API Keys Management**: Centralized management for external service API keys using AES-256-GCM encryption at rest, stored in `travi_api_keys` with audit trail.
- **API**: Swagger UI for documentation, OpenAPI Spec, URL-based API versioning.
- **CI/CD**: GitHub Actions for automated testing and deployment.
- **Octopus v2 Content Engine**: Graph-based content generation with PostgreSQL persistence, queue infrastructure, entity resolution, AI tagging, and placement rules. Dashboard API routes at `/api/octopus/*` connect frontend to local Octypo engine (stats, jobs, entities, capabilities, queue-status).
- **Localization System (NO-AUTOMATIC-TRANSLATION Architecture)**: 
  - **HARD DISABLED (January 2026)**: All automatic translation is permanently disabled. Translations must be done manually via admin UI.
  - **Translation Guards**: All translation entry points (`translateContent`, `translateToAllLanguages`, `translateTags`, `translateDestinationContent`) throw `TranslationDisabledError` via `assertTranslationEnabled` guard.
  - **Disabled Components**: Translation queue, translation worker, publish hooks auto-translate, auto-pilot translation triggers, RSS auto-translate, and all translation API endpoints (return 410 Gone).
  - **i18next Infrastructure**: Static UI strings and locale routing preserved via i18next for client-side localization.
  - **AEO Engine**: Answer Engine Optimization for generating answer capsules, FAQs, and JSON-LD schema (still active, translation-independent).
  - **G2-03 Homepage Localization (COMPLETED January 2026)**: All homepage sections fully localized via t() calls:
    - HeroSection: t("home.hero.*"), t("home.stats.*") with interpolated numeric values
    - DestinationsSection: t("destinations.cities.*.name/country/cardAlt") for 16 cities
    - FAQSection: t("home.faq.*") for 4 FAQ items
    - CategoriesSection: t("home.categories.*")
    - TravelStylesSection: t("home.experiences.*")
    - NewsletterSectionLite: t("newsletter.*")
    - RTL CSS applied: text-start/end, ms-/me-, start-/end-, rtl:rotate-180 for directional icons
  - **Genesis G1 Infrastructure (January 2026)**: Complete localization infrastructure with:
    - **Locale Middleware** (`server/middleware/locale.ts`): URL-based locale extraction, RTL detection, `req.locale`/`req.isRTL` augmentation
    - **Locale Service** (`server/services/locale-service.ts`): Translation fallback pattern (requested → en → null), localized URL helpers
    - **Multi-locale Sitemaps**: All 17 locales activated in sitemap index with per-locale sitemap files
    - **HTTP Headers**: `Content-Language` and `Vary: Accept-Language` headers on all responses
    - **hreflang Tags**: Complete implementation in SEOHead for all 17 locales plus x-default
- **Localized Assets System**: New `localized_assets` table for per-locale media (hero, card, gallery, OG, thumbnail, banner, logo). 
  - **API Routes**: `/api/localized-assets/:entityType/:entityId` with locale/usage fallback logic (requested → en → 404).
  - **Admin Routes**: `/api/admin/localized-assets` for CRUD with strict Zod enum validation.
  - **Frontend Hooks**: `useLocalizedContent`, `useLocalizedAsset`, `useLocalizedAssets` with automatic fallback handling.
- **SEO/AEO Module**: Centralized SEO optimization with versioned prompt templates, output normalization, and regeneration guards.
- **Image Handling**: Tracks image usage and fallback frequency. `SafeImage` component ensures image safety with error fallbacks.
- **Tiqets Integration**: Attraction data import system for 16 whitelisted cities. Images and descriptions are AI-generated, not imported. Pricing is for internal sorting/filtering only.
- **Octypo V2 Content Engine**: High-quality AI content generation for travel attractions. Features a multi-agent architecture (8 writer personas, 6 validator agents) and a multi-provider AI pool (72 AI Engines across Anthropic, OpenAI, OpenRouter, Gemini, Groq, Mistral, DeepSeek, Together, Perplexity). Adheres to strict blueprint compliance for content structure and quality thresholds. Job queue system with persistent PostgreSQL-backed jobs supporting RSS content generation, topic-based generation, and manual content creation. Routes: `/api/octypo/queue-status`, `/api/octypo/jobs/create`, `/api/octypo/jobs/:id/process`. Uses Railway PostgreSQL (RAILWAY_DATABASE_URL) for job persistence.
- **Travel Intelligence Data Ingestion**: Modular system with cron scheduling for visa requirements (Passport Index), health alerts (WHO), and events (curated data + Wikidata SPARQL).
- **External Data Integration**: Integrates 180M+ external travel POIs with 6 AI content quality tools (hallucination detection, readability, paraphrasing, feedback, prompt A/B testing). Utilizes `pgvector` for semantic search embeddings and H3 for hexagonal hierarchical spatial indexing. Prioritized ingestion from sources like dr5hn/countries-states-cities, Overture Maps, TourPedia, Wikivoyage, and GeoNames. AI models for guide rewriting include DeepSeek V3, Gemini 1.5 Flash, GPT-4o mini via OpenRouter.
- **Admin Panel Redesign**: Consolidated 90+ pages into 23 organized module groups, with a new sidebar structure, an `AdminDashboard`, and global components like `MagicAIButton` (AI content generation for 30 languages) and `MultiLanguageEditor` (rich text editor for 30 languages with RTL support).
- **Dubai Destination Pages**: Deployment of 72 Dubai-specific pages under `/destinations/dubai/` with structured routes for districts, off-plan properties, comparisons, tools, case studies, and pillar pages.
- **Travel Guides Hero Redesign**: Redesigned hero section for travel guides to match attractions page style with interactive elements, animations, and a split-screen layout.

### Design Choices
- **Homepage**: Features a mascot, gradient logo, search bar, quick-links, and a glassmorphism newsletter.
- **Admin Pages**: Bilingual Hebrew/English "How It Works" guidance, stats cards, and dark mode.
- **Visual Content Editor**: Wix-style editor with drag-drop, inline editing, preview, auto-save, and bilingual support.
- **Footer**: Three-tiered structure.
- **Destination Pages (Cinematic Redesign)**: Full-bleed immersive hero with multi-layer parallax, mood overlays, and animated elements.
- **Attractions Page (Split-Screen Hero)**: Modern two-column layout with animated backgrounds, headline, premium search, trending tags, stat cards, and a bento-style image gallery. Supports dark mode and ARIA accessibility.
- **Image-Led Sections**: CMS-driven sections (Featured Attractions, Featured Areas, Featured Highlights) enforcing "No image = No section" rule, stored as JSONB.

### Navigation Architecture
- **Global Navigation**: Destination-agnostic links (Destinations, Hotels, Attractions, Guides, News). Dining and Things to Do removed from navigation, with /things-to-do redirecting to /attractions.
- **Dubai Sub-Navigation**: Secondary navigation for Dubai-specific content.
- **Guards and Hooks**: `DubaiOnlyGuard` for access control, `useDestinationContext` hook.

### CMS Contracts
- **Image System**: Strict separation of hero and card images.
- **CTA System**: Defined hierarchy for Primary, Secondary, and Tertiary CTAs with placement restrictions.
- **Content Types & Hierarchy**: Structured content for Destinations (Country → City → Area), Category Pages, Items (Attractions, Hotels, Articles), and News Articles.
- **Field Ownership Contracts** (`shared/field-ownership.ts`): Defines ONE COMPONENT, ONE FIELD principle - each SEO/content field has a single authoritative admin component. Prevents data conflicts and enforces "Railway PostgreSQL as single source of truth" with no auto-generation or fallbacks.

### SEO Management
- **Page SEO Editor** (`/admin/page-seo`): Centralized control for index page SEO (destinations, hotels, attractions, guides). Database-driven with NO fallbacks.
- **Character Limits**: Enforced limits with red warning indicators:
  - Meta Title: 30-60 characters
  - Meta Description: 120-160 characters
  - OG Title: 40-70 characters
  - OG Description: 120-160 characters
- **AI SEO Generation**: `/api/ai/generate-page-seo` endpoint with Magic Button in editor, includes quality scoring (title, description, overall) and improvement suggestions.
- **Capability-Based Field Ownership**: Dedicated `canEditPageSeo` permission in ROLE_PERMISSIONS enforces exclusive write access to page_seo table. Routes use `requirePermission("canEditPageSeo")` for capability-based authorization. Contract validation at `/api/admin/page-seo/:pagePath` returns:
  - 403 FIELD_OWNERSHIP_VIOLATION for unauthorized fields
  - 500 CONTRACT_VIOLATION for configuration errors
  - 400 CHARACTER_LIMIT_VIOLATION for invalid lengths

## External Dependencies

- **Database**: PostgreSQL (`DATABASE_URL`), `connect-pg-simple`.
- **Object Storage**: Replit Object Storage (`@replit/object-storage`).
- **AI Services**: Anthropic, OpenAI, DeepSeek, OpenRouter.
- **Translation**: DISABLED - All automatic translation is permanently disabled. Manual translation only via admin UI.
- **Social Media APIs**: LinkedIn, Twitter/X, Facebook, Instagram.
- **Affiliate Programs**: Booking.com, GetYourGuide, TripAdvisor, Tiqets.
- **Analytics**: Google Tag Manager (GTM-WVXXVS6L).
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React, cmdk, embla-carousel-react, react-day-picker, vaul.