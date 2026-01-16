# Travi CMS - Product Requirements Document
## Dubai Travel Content Management System

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** Development (MVP)

---

## 1. Executive Summary

Travi is a comprehensive Content Management System designed for Dubai Travel, enabling creation, management, and optimization of travel-focused content. The system supports 8 content types, AI-powered content generation, SEO optimization, affiliate link management, newsletter system, and multi-language support.

### Key Capabilities
- Full CMS with block-based content editor
- AI content generation via OpenAI
- SEO optimization with JSON-LD schema
- Affiliate link management
- Newsletter system with double opt-in
- Role-based access control (5 user roles)
- Multi-language support (10 locales)
- Analytics and audit logging
- Telegram bot integration

---

## 2. System Architecture

### 2.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS |
| State Management | TanStack React Query |
| Routing | Wouter |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM with Zod validation |
| File Storage | Replit Object Storage |
| AI | OpenAI API (GPT-4, DALL-E 3) |
| Email | Resend API |

### 2.2 Project Structure

```
├── client/
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # 49 page components
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities
├── server/
│   ├── routes.ts           # API endpoints (~80+)
│   ├── storage.ts          # Data access layer
│   ├── ai-generator.ts     # AI content generation
│   └── telegram-bot.ts     # Telegram integration
└── shared/
    └── schema.ts           # Database schema (36 tables)
```

---

## 3. Database Schema

### 3.1 Core Tables (36 Total)

#### Content System
| Table | Purpose |
|-------|---------|
| `contents` | Base content table (title, slug, SEO, blocks, status) |
| `attractions` | Attraction-specific data (location, duration, pricing) |
| `hotels` | Hotel data (star rating, amenities, room types) |
| `articles` | Article data (category, source, RSS feed) |
| `dining` | Restaurant data (cuisine, price range) |
| `districts` | District/neighborhood data |
| `transports` | Transportation guide data |
| `events` | Event data (dates, venue, tickets) |
| `itineraries` | Trip itinerary data (day plans, pricing) |

#### User & Access
| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and 2FA |
| `sessions` | Session storage for auth |

#### SEO & Content Organization
| Table | Purpose |
|-------|---------|
| `content_versions` | Version history for rollback |
| `translations` | Multi-language content |
| `keyword_repository` | SEO keyword database |
| `topic_bank` | Auto-article topics |
| `tags` | Content tagging |
| `content_tags` | Tag-content junction |
| `content_clusters` | Pillar page groupings |
| `cluster_members` | Cluster membership |
| `seo_analysis_results` | Cached SEO scores |

#### External Integrations
| Table | Purpose |
|-------|---------|
| `rss_feeds` | RSS feed sources |
| `content_fingerprints` | Deduplication hashes |
| `affiliate_links` | Affiliate tracking |
| `media_files` | Media library |
| `internal_links` | Internal linking |

#### Marketing & Analytics
| Table | Purpose |
|-------|---------|
| `newsletter_subscribers` | Email list with GDPR compliance |
| `newsletter_campaigns` | Email campaign management |
| `campaign_events` | Campaign tracking (opens, clicks) |
| `homepage_promotions` | Curated homepage sections |
| `content_views` | Analytics tracking |
| `audit_logs` | Immutable activity log |

#### Content Organization
| Table | Purpose |
|-------|---------|
| `content_templates` | Reusable content structures |
| `site_settings` | Global configuration |
| `seo_analysis_results` | Cached SEO analysis |

#### Telegram Bot
| Table | Purpose |
|-------|---------|
| `telegram_user_profiles` | Bot user data with gamification |
| `telegram_user_favorites` | Saved content |
| `telegram_conversations` | Chat history for context

---

## 4. Content Types (8)

### 4.1 Attractions
- Location, category, duration, pricing
- Target audience, highlights, gallery
- Ticket info, visitor tips, FAQ
- Experience steps, insider tips

### 4.2 Hotels
- Star rating, room count, amenities
- Room types, dining options, activities
- Location nearby, traveler tips
- Photo gallery, trust signals

### 4.3 Articles
- Category (attractions, hotels, food, transport, events, tips, news, shopping)
- RSS source tracking
- Quick facts, pro tips, warnings
- FAQ section

### 4.4 Dining
- Cuisine type, price range
- Menu highlights, dining tips
- Photo gallery, essential info

### 4.5 Districts
- Neighborhood info, subcategory
- Things to do, attractions grid
- Dining highlights, real estate info
- Local tips, photo gallery

### 4.6 Transport
- Transit mode, route info
- Fare information, travel tips
- Essential info, FAQ

### 4.7 Events
- Event dates, venue, ticket info
- Featured/recurring flags
- Organizer contact

### 4.8 Itineraries
- Duration, total price, difficulty
- Day-by-day plan
- Included/excluded items

---

## 5. Content Block Types

The block-based editor supports:
- `hero` - Hero image with title/subtitle
- `text` - Rich text content
- `image` - Single image with alt text
- `gallery` - Image gallery
- `highlights` - Key highlights list
- `tips` - Expert tips section
- `faq` - FAQ accordion
- `cta` - Call-to-action button
- `info_grid` - Information grid
- `quote` - Blockquote
- `video` - Embedded video

---

## 6. User Roles & Permissions

### 6.1 Role Hierarchy

| Role | Create | Edit Own | Edit All | Delete | Publish | Manage Users |
|------|--------|----------|----------|--------|---------|--------------|
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Editor | Yes | Yes | Yes | No | Yes | No |
| Author | Yes | Yes | No | No | No | No |
| Contributor | Yes | Yes | No | No | No | No |
| Viewer | No | No | No | No | No | No |

### 6.2 Additional Permissions
- `canViewAnalytics` - Admin, Editor
- `canViewAuditLogs` - Admin only
- `canAccessMediaLibrary` - Admin, Editor
- `canAccessAffiliates` - Admin, Editor
- `canManageSettings` - Admin only

---

## 7. API Endpoints (80+)

### 7.1 Authentication
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/login` | No |
| GET | `/api/auth/user` | Yes |
| GET | `/api/user/permissions` | Yes |
| POST | `/api/totp/setup` | Yes |
| POST | `/api/totp/verify` | Yes |
| POST | `/api/totp/disable` | Yes |

### 7.2 Content Management
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/contents` | No |
| GET | `/api/contents/:id` | No* |
| GET | `/api/contents/slug/:slug` | No |
| POST | `/api/contents` | Yes* |
| PATCH | `/api/contents/:id` | Yes* |
| DELETE | `/api/contents/:id` | Yes* |
| GET | `/api/public/contents` | No |

*Note: Some endpoints temporarily have auth disabled for testing (marked with TODO)

### 7.3 Content Versions
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/contents/:id/versions` | Yes |
| GET | `/api/contents/:id/versions/:versionId` | Yes |
| POST | `/api/contents/:id/versions/:versionId/restore` | Yes |

### 7.4 Translations
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/locales` | No |
| GET | `/api/contents/:id/translations` | No |
| POST | `/api/contents/:id/translations` | Yes |
| PATCH | `/api/translations/:id` | Yes |
| DELETE | `/api/translations/:id` | Yes |

### 7.5 RSS Feeds
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/rss-feeds` | Yes |
| POST | `/api/rss-feeds` | Yes |
| PATCH | `/api/rss-feeds/:id` | Yes |
| DELETE | `/api/rss-feeds/:id` | Yes |
| POST | `/api/rss-feeds/:id/fetch` | Yes |
| POST | `/api/rss-feeds/:id/import` | Yes |

### 7.6 AI Generation
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/ai/generate` | Yes |
| POST | `/api/ai/generate-article` | Yes |
| POST | `/api/ai/generate-hotel` | Yes |
| POST | `/api/ai/generate-seo-schema` | Yes |
| POST | `/api/ai/generate-images` | Yes |
| POST | `/api/ai/generate-single-image` | Yes |
| POST | `/api/ai/suggest-internal-links` | Yes |
| POST | `/api/ai/block-action` | Yes |
| POST | `/api/ai/assistant` | Yes |

### 7.7 Topic Bank
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/topic-bank` | No |
| POST | `/api/topic-bank` | Yes |
| PATCH | `/api/topic-bank/:id` | Yes |
| DELETE | `/api/topic-bank/:id` | Yes |
| POST | `/api/topic-bank/:id/generate` | Yes |
| POST | `/api/topic-bank/auto-generate` | Yes |

### 7.8 Keywords
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/keywords` | No |
| POST | `/api/keywords` | Yes |
| PATCH | `/api/keywords/:id` | Yes |
| DELETE | `/api/keywords/:id` | Yes |
| POST | `/api/keywords/bulk-import` | Yes |

### 7.9 Affiliate Links
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/affiliate-links` | Yes |
| POST | `/api/affiliate-links` | Yes |
| PATCH | `/api/affiliate-links/:id` | Yes |
| DELETE | `/api/affiliate-links/:id` | Yes |

### 7.10 Media Library
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/media` | No |
| POST | `/api/media/upload` | Yes |
| PATCH | `/api/media/:id` | Yes |
| DELETE | `/api/media/:id` | Yes |

### 7.11 Users Management
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| PATCH | `/api/users/:id` | Admin |
| DELETE | `/api/users/:id` | Admin |

### 7.12 Homepage Promotions
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/homepage-promotions/:section` | No |
| POST | `/api/homepage-promotions` | Yes |
| PATCH | `/api/homepage-promotions/:id` | Yes |
| DELETE | `/api/homepage-promotions/:id` | Yes |
| POST | `/api/homepage-promotions/reorder` | Yes |

### 7.13 Analytics
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/analytics/overview` | Yes |
| GET | `/api/analytics/views-over-time` | Yes |
| GET | `/api/analytics/top-content` | Yes |
| GET | `/api/analytics/by-content-type` | Yes |
| POST | `/api/analytics/record-view/:contentId` | No |

### 7.14 Audit Logs
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/audit-logs` | Admin |

### 7.15 Newsletter
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/newsletter/subscribe` | No |
| GET | `/api/newsletter/confirm/:token` | No |
| GET | `/api/newsletter/unsubscribe` | No |
| GET | `/api/newsletter/subscribers` | Admin |
| DELETE | `/api/newsletter/subscribers/:id` | Admin |

---

## 8. Admin Panel Pages (25+)

| Route | Page | Function |
|-------|------|----------|
| `/admin` | Dashboard | Overview stats, quick actions |
| `/admin/attractions` | Attractions List | View/manage attractions |
| `/admin/attractions/new` | Content Editor | Create attraction |
| `/admin/attractions/:id` | Content Editor | Edit attraction |
| `/admin/hotels` | Hotels List | View/manage hotels |
| `/admin/dining` | Dining List | View/manage restaurants |
| `/admin/districts` | Districts List | View/manage districts |
| `/admin/transport` | Transport List | View/manage transport |
| `/admin/articles` | Articles List | View/manage articles |
| `/admin/events` | Events List | View/manage events |
| `/admin/itineraries` | Itineraries List | View/manage itineraries |
| `/admin/rss-feeds` | RSS Feeds | Manage RSS sources |
| `/admin/ai-generator` | AI Generator | Generate content with AI |
| `/admin/topic-bank` | Topic Bank | Article topic ideas |
| `/admin/keywords` | Keywords | SEO keyword management |
| `/admin/clusters` | Clusters | Content clustering |
| `/admin/tags` | Tags | Tag management |
| `/admin/affiliate-links` | Affiliate Links | Affiliate management |
| `/admin/media` | Media Library | File management |
| `/admin/users` | Users | User management |
| `/admin/homepage-promotions` | Homepage | Homepage curation |
| `/admin/analytics` | Analytics | View statistics |
| `/admin/audit-logs` | Audit Logs | Activity history |
| `/admin/newsletter` | Newsletter | Subscriber management |
| `/admin/campaigns` | Campaigns | Email campaigns |
| `/admin/settings` | Settings | Site configuration |

---

## 9. Public Pages

### 9.1 Content Detail Pages
| Route | Content Type |
|-------|--------------|
| `/attractions/:slug` | Attraction detail |
| `/hotels/:slug` | Hotel detail |
| `/dining/:slug` | Restaurant detail |
| `/districts/:slug` | District detail |
| `/transport/:slug` | Transport guide detail |
| `/articles/:slug` | Article detail |
| `/events/:slug` | Event detail |
| `/itineraries/:slug` | Itinerary detail |

### 9.2 List & Utility Pages (In Codebase)
| Route | Page Component |
|-------|--------------|
| `/` | Coming Soon with newsletter |
| `/attractions` | public-attractions.tsx |
| `/hotels` | public-hotels.tsx |
| `/dining` | public-dining.tsx |
| `/districts` | public-districts.tsx |
| `/transport` | public-transport.tsx |
| `/articles` | public-articles.tsx |
| `/events` | public-events.tsx |
| `/search` | public-search.tsx |
| `/currency` | public-currency.tsx |
| `/budget` | public-budget.tsx |
| `/privacy-policy` | privacy-policy.tsx |
| `/terms` | terms-conditions.tsx |

### 9.3 Notes
- Homepage currently shows Coming Soon placeholder
- List page components exist but may need route wiring
- Search functionality available

---

## 10. AI Integration

### 10.1 Content Generation
- Full article generation from title/keywords
- Hotel content generation
- Attraction content generation
- SEO schema generation (JSON-LD)

### 10.2 Image Generation
- DALL-E 3 integration
- Hero images
- Content illustrations
- Automatic storage persistence

### 10.3 AI Assistant
- In-editor AI assistant
- Block-level actions (expand, summarize, translate)
- Internal link suggestions

---

## 11. SEO Features

### 11.1 On-Page SEO
- Meta title/description
- Primary/secondary keywords
- LSI keywords
- Hero image alt text
- Word count tracking

### 11.2 JSON-LD Schema
- TouristAttraction
- Hotel
- Restaurant
- Article
- Event
- FAQPage

### 11.3 SEO Analysis
- Overall score calculation
- Title/description scoring
- Keyword density analysis
- Content quality scoring
- Issue/suggestion tracking

---

## 12. Multi-Language Support

### 12.1 Supported Locales (10)
- English (en)
- Arabic (ar)
- Chinese (zh)
- Russian (ru)
- German (de)
- French (fr)
- Spanish (es)
- Hindi (hi)
- Japanese (ja)
- Korean (ko)

### 12.2 Translation Features
- Per-content translations
- Status tracking (pending, in_progress, completed, needs_review)
- Translator/reviewer attribution

---

## 13. Newsletter System

### 13.1 Features
- Double opt-in with email confirmation
- GDPR-compliant consent logging
- Welcome email automation
- Unsubscribe functionality
- Source tracking

### 13.2 Subscriber Statuses
- `pending_confirmation`
- `subscribed`
- `unsubscribed`
- `bounced`
- `complained`

---

## 14. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `SESSION_SECRET` | Session encryption | Yes |
| `OPENAI_API_KEY` | AI features | For AI |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | File storage | For uploads |
| `RESEND_API_KEY` | Email sending | For newsletter |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | For bot |
| `ADMIN_PASSWORD_HASH` | Admin login | For auth |

---

## 15. Known Issues & TODOs

### 15.1 Security - ✅ RESOLVED
All API endpoints are properly protected:
- `GET /api/contents` - Protected with `requireAuth`
- `GET /api/contents/:id` - Protected with `requireAuth`
- `POST /api/contents` - Protected with `requirePermission("canCreate")`
- `PATCH /api/contents/:id` - Protected with `requireOwnContentOrPermission("canEdit")`
- `DELETE /api/contents/:id` - Protected with `requirePermission("canDelete")`
- `POST /api/contents/bulk-delete` - Protected with `requirePermission("canDelete")`

### 15.2 Public Site
- Homepage shows "Coming Soon" placeholder (content pending)
- List pages available for published content
- Search functionality available at `/api/search`
- Homepage promotions system ready for content

### 15.3 AI Templates
- AI generates placeholder data that should be verified before publishing
- GPS coordinates, phone numbers, and prices require manual verification

### 15.4 Telegram Bot - ARCHIVED
- Telegram integration has been archived (see ARCHIVED_CODE_v1.0.md)
- Database tables remain for potential future use

---

## 16. Content Workflow

### 16.1 Status Flow
```
draft → in_review → approved → scheduled → published
```

### 16.2 Version Control
- Automatic version creation on edit
- Version history viewing
- Restore to previous version

### 16.3 Scheduling
- Schedule content for future publication
- Automatic publishing automation (runs every minute)

---

## 17. Analytics & Audit

### 17.1 Content Analytics
- View counts per content
- Views over time
- Top content ranking
- Content type breakdown

### 17.2 Audit Logging
- All CRUD operations logged
- User actions tracked
- Before/after state capture
- IP address and user agent logging

---

## 18. Future Roadmap

### Phase 1 - Security & Stability
- [ ] Restore authentication on all protected endpoints
- [ ] Add rate limiting
- [ ] Implement CSRF protection

### Phase 2 - Public Site
- [ ] Build homepage with featured content
- [ ] Create list pages for all content types
- [ ] Implement search functionality
- [ ] Add filtering and pagination

### Phase 3 - Enhancement
- [ ] Complete Telegram bot features
- [ ] Add A/B testing for content
- [ ] Implement advanced analytics
- [ ] Add content scheduling UI

---

## 19. API Response Formats

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { ... }
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 20. Content Block Schema

### Hero Block
```json
{
  "type": "hero",
  "data": {
    "title": "Page Title",
    "subtitle": "Subtitle text",
    "overlayText": "Optional overlay",
    "image": "url/to/image.jpg"
  }
}
```

### Text Block
```json
{
  "type": "text",
  "data": {
    "content": "HTML or markdown content"
  }
}
```

### Highlights Block
```json
{
  "type": "highlights",
  "data": {
    "title": "Key Highlights",
    "items": ["Highlight 1", "Highlight 2", "..."]
  }
}
```

### FAQ Block
```json
{
  "type": "faq",
  "data": {
    "title": "Frequently Asked Questions",
    "faqs": [
      { "question": "Q1?", "answer": "A1" },
      { "question": "Q2?", "answer": "A2" }
    ]
  }
}
```

### CTA Block
```json
{
  "type": "cta",
  "data": {
    "title": "Ready to Book?",
    "content": "Description text",
    "buttonText": "Book Now",
    "buttonLink": "https://..."
  }
}
```

---

*End of PRD Document*
