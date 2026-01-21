# Travi CMS - Dubai Travel Content Management System

## Overview
Travi CMS is a content management system for Dubai Travel, focused on managing travel content like attractions, hotels, and articles from RSS feeds. Its primary goals are SEO optimization, seamless affiliate link integration, and a draft-first content workflow. The system aims to be a user-friendly, multi-language platform with tools for social media marketing, offering a "Discover Dubai Like a Local" experience through advanced content generation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
- **Monorepo Structure**: React frontend (Vite), Express backend, PostgreSQL database with Drizzle ORM.
- **Content Model**: Base `contents` table extended for specific types (attractions, hotels, articles) using JSONB.
- **Workflow**: Content moves through draft, in_review, approved, scheduled, and published statuses.
- **UI/UX**: Material Design 3 / Modern Admin principles, Tailwind CSS, `shadcn/ui` with Radix primitives, supporting light/dark mode. Emphasizes opaque surfaces, a fixed blue/cyan sky gradient background, and white content cards.
- **Multi-language Support**: Supports 17 languages, including RTL, `hreflang` tags, and multi-language sitemaps, but with automatic translation permanently disabled as of January 2026. All translations must be manual.
- **SEO Focus**: Adherence to SEO best practices, including meta data, headings, linking, keyword integration, and a dedicated Dubai keyword database.
- **Admin Panel Structure**: Organized into Core Content Management, Site Configuration, Automation, Monetization, Enterprise features, and Advanced Analytics.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack React Query.
- **Backend**: Node.js, Express, TypeScript (ESM modules), RESTful APIs.
- **Data Layer**: PostgreSQL, Drizzle ORM with Zod validation.
- **File Uploads**: Multer integrated with Replit Object Storage.
- **AI Integration**: Unified provider system (OpenAI, Anthropic, OpenRouter, DeepSeek) with an AI Orchestrator for content generation, task routing, rate limiting, and credit monitoring. Includes AI-powered Auto Meta Generator for images.
- **Security**: IDOR protection, optimistic locking, and GDPR compliance APIs.
- **API Keys Management**: Centralized management for external service API keys using AES-256-GCM encryption.
- **API**: Swagger UI for documentation, OpenAPI Spec, URL-based API versioning.
- **CI/CD**: GitHub Actions for automated testing and deployment.
- **Octopus v2 Content Engine**: Graph-based content generation with PostgreSQL persistence, queue infrastructure, entity resolution, AI tagging, and placement rules.
- **Localization System (NO-AUTOMATIC-TRANSLATION Architecture)**: Automatic translation is permanently disabled. Manual translation via admin UI. Infrastructure for i18next, locale middleware, multi-locale sitemaps, HTTP headers, and `hreflang` tags are active.
- **Pilot Localization System**: Native multilingual content generation via Octypo, supporting direct generation in target locales rather than translation. Requires ≥98% target language purity.
- **Localized Assets System**: Manages per-locale media with fallback logic.
- **SEO/AEO Module**: Centralized SEO optimization with versioned prompt templates and output normalization.
- **Image Handling**: Tracks image usage and ensures safety with error fallbacks.
- **Tiqets Integration**: Attraction data import system for whitelisted cities; AI-generated images and descriptions.
- **Octypo V2 Content Engine**: High-quality AI content generation for travel attractions using a multi-agent architecture and a multi-provider AI pool.
- **Travel Intelligence Data Ingestion**: Modular system for cron-scheduled updates of visa requirements, health alerts, and events.
- **External Data Integration**: Integrates 180M+ external travel POIs with AI content quality tools and utilizes `pgvector` for semantic search and H3 for spatial indexing.
- **Admin Panel Redesign**: Consolidated UI with a new sidebar, `AdminDashboard`, `MagicAIButton` (AI content generation for 30 languages), and `MultiLanguageEditor` (rich text editor for 30 languages with RTL support).
- **Dubai Destination Pages**: Deployment of 72 Dubai-specific pages with structured routes.
- **Travel Guides Hero Redesign**: Redesigned hero section for travel guides with interactive elements and animations.

### Design Choices
- **Homepage**: Features a mascot, gradient logo, search bar, quick-links, and a glassmorphism newsletter.
- **Admin Pages**: Bilingual "How It Works" guidance, stats cards, and dark mode.
- **Visual Content Editor**: Wix-style editor with drag-drop, inline editing, preview, auto-save, and bilingual support.
- **Destination Pages (Cinematic Redesign)**: Full-bleed immersive hero with multi-layer parallax.
- **Attractions Page (Split-Screen Hero)**: Modern two-column layout with animated backgrounds, premium search, trending tags, stat cards, and a bento-style image gallery.

### Navigation Architecture
- **Global Navigation**: Destination-agnostic links (Destinations, Hotels, Attractions, Guides, News).
- **Dubai Sub-Navigation**: Secondary navigation for Dubai-specific content.
- **Guards and Hooks**: `DubaiOnlyGuard` for access control, `useDestinationContext` hook.

### CMS Contracts
- **Image System**: Strict separation of hero and card images.
- **CTA System**: Defined hierarchy for Primary, Secondary, and Tertiary CTAs with placement restrictions.
- **Content Types & Hierarchy**: Structured content for Destinations, Category Pages, Items (Attractions, Hotels, Articles), and News Articles.
- **Field Ownership Contracts**: Defines ONE COMPONENT, ONE FIELD principle, enforcing a single authoritative admin component for each SEO/content field to prevent data conflicts.

### SEO Management
- **Page SEO Editor**: Centralized control for index page SEO, database-driven with no fallbacks.
- **Character Limits**: Enforced limits for Meta Title, Meta Description, OG Title, and OG Description.
- **AI SEO Generation**: Endpoint for AI-powered SEO generation with quality scoring and improvement suggestions.
- **Capability-Based Field Ownership**: `canEditPageSeo` permission enforces exclusive write access to the `page_seo` table.

## External Dependencies

- **Database**: PostgreSQL.
- **Object Storage**: Replit Object Storage.
- **AI Services**: Anthropic, OpenAI, DeepSeek, OpenRouter.
- **Social Media APIs**: LinkedIn, Twitter/X, Facebook, Instagram.
- **Affiliate Programs**: Booking.com, GetYourGuide, TripAdvisor, Tiqets.
- **Analytics**: Google Tag Manager.
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React, cmdk, embla-carousel-react, react-day-picker, vaul.