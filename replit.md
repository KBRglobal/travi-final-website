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
- **Localization Automation + AEO Engine**: Multi-locale translation queue with multi-provider chain (DeepL, Anthropic, OpenAI, Replit AI) and Answer Engine Optimization (AEO) for generating answer capsules, FAQs, and JSON-LD schema.
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
  - Hero Title: 20-60 characters
  - Hero Subtitle: 40-120 characters
- **AI SEO Generation**: `/api/ai/generate-page-seo` endpoint with Magic Button in editor, includes quality scoring (title, description, overall) and improvement suggestions.

## External Dependencies

- **Database**: PostgreSQL (`DATABASE_URL`), `connect-pg-simple`.
- **Object Storage**: Replit Object Storage (`@replit/object-storage`).
- **AI Services**: Anthropic, OpenAI, DeepSeek, OpenRouter.
- **Translation**: DeepL API.
- **Social Media APIs**: LinkedIn, Twitter/X, Facebook, Instagram.
- **Affiliate Programs**: Booking.com, GetYourGuide, TripAdvisor, Tiqets.
- **Analytics**: Google Tag Manager (GTM-WVXXVS6L).
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React, cmdk, embla-carousel-react, react-day-picker, vaul.