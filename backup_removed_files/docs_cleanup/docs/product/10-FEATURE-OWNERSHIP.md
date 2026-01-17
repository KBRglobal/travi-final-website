# Feature Ownership Map

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## AI Roles (בעלי תחומים)

| Role ID | תחום אחריות | מה כלול |
|---------|-------------|---------|
| `CONTENT-AGENT` | Content Management | יצירה, עריכה, פרסום תוכן |
| `SEO-AGENT` | SEO & AEO | מילות מפתח, תרגומים, אופטימיזציה |
| `MEDIA-AGENT` | Media Management | תמונות, קבצים, גלריות |
| `GOVERNANCE-AGENT` | Governance | משתמשים, הרשאות, audit |
| `ANALYTICS-AGENT` | Analytics | דוחות, מטריקות, insights |
| `SYSTEM-AGENT` | System | הגדרות, integrations, ops |
| `FRONTEND-AGENT` | UI/UX | רכיבי React, עיצוב |
| `BACKEND-AGENT` | APIs | routes, services, DB |
| `SECURITY-AGENT` | Security | auth, permissions, encryption |
| `QA-AGENT` | Quality | tests, validation, monitoring |

---

## Domain: CONTENT

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `CONT-001` | Articles CRUD | CONTENT-AGENT | Active | `/admin/articles/*` |
| `CONT-002` | Attractions CRUD | CONTENT-AGENT | Active | `/admin/attractions/*` |
| `CONT-003` | Hotels CRUD | CONTENT-AGENT | Active | `/admin/hotels/*` |
| `CONT-004` | Dining CRUD | CONTENT-AGENT | Active | `/admin/dining/*` |
| `CONT-005` | Events CRUD | CONTENT-AGENT | Active | `/admin/events/*` |
| `CONT-006` | Districts CRUD | CONTENT-AGENT | Active | `/admin/districts/*` |
| `CONT-007` | Transport CRUD | CONTENT-AGENT | Active | `/admin/transport/*` |
| `CONT-008` | Destinations Hub | CONTENT-AGENT | Active | `/admin/destinations/*` |
| `CONT-009` | Landing Pages | CONTENT-AGENT | Active | `/admin/landing-pages/*` |
| `CONT-010` | Case Studies | CONTENT-AGENT | Active | `/admin/case-studies/*` |
| `CONT-011` | Off-Plan Content | CONTENT-AGENT | Active | `/admin/off-plan/*` |
| `CONT-012` | Real Estate Pages | CONTENT-AGENT | Active | `/admin/real-estate/*` |
| `CONT-013` | Static Pages | CONTENT-AGENT | Active | `/admin/static-pages/*` |
| `CONT-014` | Homepage Editor | CONTENT-AGENT | Active | `/admin/homepage` |
| `CONT-015` | Unified Editor | CONTENT-AGENT | Active | Component |
| `CONT-016` | Content Templates | CONTENT-AGENT | Active | `/admin/templates` |
| `CONT-017` | Topic Bank | CONTENT-AGENT | Active | `/admin/topic-bank` |
| `CONT-018` | AI Generator | CONTENT-AGENT | Active | `/admin/ai-generator` |
| `CONT-019` | Octopus Engine | CONTENT-AGENT | Beta | `/admin/octopus` |
| `CONT-020` | Writers Management | CONTENT-AGENT | Active | `/admin/writers` |
| `CONT-021` | Newsroom | CONTENT-AGENT | Beta | `/admin/writers/newsroom` |
| `CONT-022` | Content Calendar | CONTENT-AGENT | Active | `/admin/calendar` |
| `CONT-023` | RSS Feeds | CONTENT-AGENT | Active | `/admin/rss-feeds` |
| `CONT-024` | Help Center Admin | CONTENT-AGENT | Active | `/admin/help/*` |
| `CONT-025` | Surveys | CONTENT-AGENT | Active | `/admin/surveys/*` |
| `CONT-026` | Page Builder | CONTENT-AGENT | Beta | `/admin/page-builder` |
| `CONT-027` | Visual Editor | CONTENT-AGENT | Beta | `/admin/visual-editor/*` |

---

## Domain: SEO

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `SEO-001` | Keywords Library | SEO-AGENT | Active | `/admin/keywords` |
| `SEO-002` | Clusters | SEO-AGENT | Active | `/admin/clusters` |
| `SEO-003` | Tags | SEO-AGENT | Active | `/admin/tags` |
| `SEO-004` | SEO Audit | SEO-AGENT | Active | `/admin/seo-audit` |
| `SEO-005` | AEO Dashboard | SEO-AGENT | Active | `/admin/aeo` |
| `SEO-006` | Translations | SEO-AGENT | Active | `/admin/translations` |
| `SEO-007` | Content Rules | SEO-AGENT | Active | `/admin/content-rules` |
| `SEO-008` | Destination Intelligence | SEO-AGENT | Active | `/admin/destination-intelligence` |
| `SEO-009` | Content Intelligence | SEO-AGENT | Beta | `/admin/content-intelligence` |

---

## Domain: MEDIA

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `MEDIA-001` | Media Library | MEDIA-AGENT | Active | `/admin/media` |
| `MEDIA-002` | Image Engine | MEDIA-AGENT | Active | `/admin/image-engine` |
| `MEDIA-003` | File Upload API | MEDIA-AGENT | Active | `/api/upload/*` |
| `MEDIA-004` | Image Optimization | MEDIA-AGENT | Planned | - |
| `MEDIA-005` | Media Audit | MEDIA-AGENT | Planned | - |

---

## Domain: GOVERNANCE

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `GOV-001` | Users Management | GOVERNANCE-AGENT | Active | `/admin/users` |
| `GOV-002` | Roles (Schema) | GOVERNANCE-AGENT | Active | Schema |
| `GOV-003` | Permissions Check | GOVERNANCE-AGENT | Active | Middleware |
| `GOV-004` | Audit Logs | GOVERNANCE-AGENT | Active | `/admin/audit-logs` |
| `GOV-005` | System Logs | GOVERNANCE-AGENT | Active | `/admin/logs` |
| `GOV-006` | Security Settings | SECURITY-AGENT | Active | `/admin/security` |
| `GOV-007` | Governance Dashboard | GOVERNANCE-AGENT | Frozen | `/admin/governance` |
| `GOV-008` | Governance Roles | GOVERNANCE-AGENT | Frozen | `/admin/governance/roles` |
| `GOV-009` | Governance Policies | GOVERNANCE-AGENT | Frozen | `/admin/governance/policies` |
| `GOV-010` | Governance Approvals | GOVERNANCE-AGENT | Frozen | `/admin/governance/approvals` |
| `GOV-011` | Review Workflow | GOVERNANCE-AGENT | Planned | - |
| `GOV-012` | Version Control UI | GOVERNANCE-AGENT | Planned | - |

---

## Domain: ANALYTICS

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `ANLYT-001` | Analytics Dashboard | ANALYTICS-AGENT | Active | `/admin/analytics` |
| `ANLYT-002` | Growth Dashboard | ANALYTICS-AGENT | Active | `/admin/growth-dashboard` |
| `ANLYT-003` | Intelligence Hub | ANALYTICS-AGENT | Active | `/admin/intelligence` |
| `ANLYT-004` | Customer Journey | ANALYTICS-AGENT | Active | `/admin/analytics/journey` |
| `ANLYT-005` | Search Analytics | ANALYTICS-AGENT | Active | `/admin/analytics/search` |
| `ANLYT-006` | Plagiarism Check | ANALYTICS-AGENT | Active | `/admin/analytics/plagiarism` |

---

## Domain: SYSTEM

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `SYS-001` | Settings | SYSTEM-AGENT | Active | `/admin/settings` |
| `SYS-002` | Site Settings | SYSTEM-AGENT | Deprecated | `/admin/site-settings` |
| `SYS-003` | Navigation Manager | SYSTEM-AGENT | Active | `/admin/navigation` |
| `SYS-004` | Footer Manager | SYSTEM-AGENT | Active | `/admin/footer` |
| `SYS-005` | System Health | SYSTEM-AGENT | Active | `/admin/system-health` |
| `SYS-006` | Operations Dashboard | SYSTEM-AGENT | Active | `/admin/operations` |
| `SYS-007` | QA Dashboard | SYSTEM-AGENT | Active | `/admin/qa` |
| `SYS-008` | Console | SYSTEM-AGENT | Deprecated | `/admin/console` |
| `SYS-009` | Auto-Pilot | SYSTEM-AGENT | Active | `/admin/auto-pilot` |
| `SYS-010` | Change Management | SYSTEM-AGENT | Active | `/admin/changes` |
| `SYS-011` | Entity Merge | SYSTEM-AGENT | Deprecated | `/admin/entity-merge` |
| `SYS-012` | Search Debug | SYSTEM-AGENT | Deprecated | `/admin/search-debug` |

---

## Domain: MONETIZATION

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `MON-001` | Affiliate Links | CONTENT-AGENT | Active | `/admin/affiliate-links` |
| `MON-002` | Affiliate Dashboard | ANALYTICS-AGENT | Active | `/admin/monetization/affiliates` |
| `MON-003` | Premium Content | CONTENT-AGENT | Active | `/admin/monetization/premium` |
| `MON-004` | Business Listings | CONTENT-AGENT | Active | `/admin/monetization/listings` |
| `MON-005` | Lead Management | ANALYTICS-AGENT | Active | `/admin/monetization/leads` |
| `MON-006` | Referrals | ANALYTICS-AGENT | Active | `/admin/referrals` |
| `MON-007` | Newsletter | CONTENT-AGENT | Active | `/admin/newsletter` |
| `MON-008` | Campaigns | CONTENT-AGENT | Active | `/admin/campaigns` |

---

## Domain: DISTRIBUTION

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `DIST-001` | Social Dashboard | CONTENT-AGENT | Beta | `/admin/social/*` |
| `DIST-002` | Chat Inbox | CONTENT-AGENT | Active | `/admin/chat` |

---

## Domain: ENTERPRISE (Frozen)

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `ENT-001` | Teams | GOVERNANCE-AGENT | Frozen | `/admin/enterprise/teams` |
| `ENT-002` | Workflows | GOVERNANCE-AGENT | Frozen | `/admin/enterprise/workflows` |
| `ENT-003` | Webhooks | SYSTEM-AGENT | Frozen | `/admin/enterprise/webhooks` |
| `ENT-004` | Activity Feed | ANALYTICS-AGENT | Frozen | `/admin/enterprise/activity` |

---

## Domain: PUBLIC WEBSITE

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `PUB-001` | Homepage | FRONTEND-AGENT | Active | `/` |
| `PUB-002` | Search | FRONTEND-AGENT | Active | `/search` |
| `PUB-003` | Attractions List | FRONTEND-AGENT | Active | `/attractions` |
| `PUB-004` | Attractions Map | FRONTEND-AGENT | Active | `/attractions/map` |
| `PUB-005` | Attraction Detail | FRONTEND-AGENT | Active | `/attractions/:slug` |
| `PUB-006` | Hotels List | FRONTEND-AGENT | Active | `/hotels` |
| `PUB-007` | Hotel Detail | FRONTEND-AGENT | Active | `/hotels/:slug` |
| `PUB-008` | Dining List | FRONTEND-AGENT | Active | `/dining` |
| `PUB-009` | Dining Detail | FRONTEND-AGENT | Active | `/dining/:slug` |
| `PUB-010` | Districts Gateway | FRONTEND-AGENT | Active | `/districts` |
| `PUB-011` | District Pages | FRONTEND-AGENT | Active | `/districts/:slug` |
| `PUB-012` | Articles List | FRONTEND-AGENT | Active | `/articles` |
| `PUB-013` | Article Detail | FRONTEND-AGENT | Active | `/articles/:slug` |
| `PUB-014` | Events List | FRONTEND-AGENT | Active | `/events` |
| `PUB-015` | Event Detail | FRONTEND-AGENT | Active | `/events/:slug` |
| `PUB-016` | News | FRONTEND-AGENT | Active | `/news` |
| `PUB-017` | Destinations | FRONTEND-AGENT | Active | `/destinations/*` |
| `PUB-018` | Dubai Guide | FRONTEND-AGENT | Active | `/dubai` |
| `PUB-019` | Help Center | FRONTEND-AGENT | Active | `/help/*` |
| `PUB-020` | Real Estate Portal | FRONTEND-AGENT | Active | `/dubai-real-estate` |
| `PUB-021` | Off-Plan Pages | FRONTEND-AGENT | Active | `/dubai-off-plan-*` |
| `PUB-022` | Developer Pages | FRONTEND-AGENT | Active | `/off-plan-*` |
| `PUB-023` | Comparison Pages | FRONTEND-AGENT | Active | `/compare-*` |
| `PUB-024` | Tools | FRONTEND-AGENT | Active | `/tools-*` |
| `PUB-025` | Case Studies | FRONTEND-AGENT | Active | `/case-study-*` |
| `PUB-026` | Landing Pages | FRONTEND-AGENT | Active | `/dubai/*` |
| `PUB-027` | Legal Pages | FRONTEND-AGENT | Active | `/privacy`, `/terms`, etc. |
| `PUB-028` | About | FRONTEND-AGENT | Active | `/about` |
| `PUB-029` | Contact | FRONTEND-AGENT | Active | `/contact` |
| `PUB-030` | Partners | FRONTEND-AGENT | Active | `/partners/*` |
| `PUB-031` | V2 Pages | FRONTEND-AGENT | Beta | `/v2/*` |
| `PUB-032` | Login | SECURITY-AGENT | Active | `/login` |

---

## Domain: BACKEND/API

### Features

| Feature ID | Feature Name | Owner | Status | Routes |
|------------|-------------|-------|--------|--------|
| `API-001` | Auth API | SECURITY-AGENT | Active | `/api/auth/*` |
| `API-002` | TOTP API | SECURITY-AGENT | Active | `/api/totp/*` |
| `API-003` | Content API | BACKEND-AGENT | Active | `/api/admin/content/*` |
| `API-004` | Media API | BACKEND-AGENT | Active | `/api/upload/*` |
| `API-005` | Users API | BACKEND-AGENT | Active | `/api/admin/users/*` |
| `API-006` | Analytics API | BACKEND-AGENT | Active | `/api/admin/analytics/*` |
| `API-007` | Growth API | BACKEND-AGENT | Active | `/api/admin/growth/*` |
| `API-008` | Audit API | BACKEND-AGENT | Active | `/api/admin/audit/*` |
| `API-009` | Intelligence API | BACKEND-AGENT | Active | `/api/admin/intelligence/*` |
| `API-010` | Scheduling API | BACKEND-AGENT | Active | `/api/admin/scheduling/*` |
| `API-011` | Public API | BACKEND-AGENT | Active | `/api/public/*` |
| `API-012` | Help API | BACKEND-AGENT | Active | `/api/admin/help/*` |

---

## Ownership Rules

### 1. Primary Owner
כל Feature יש לו Owner אחד בלבד. הוא אחראי על:
- תכנון שינויים
- ביצוע שינויים
- בדיקות
- תיעוד

### 2. Cross-Domain
כאשר שינוי נוגע ב-2+ domains:
1. Owner הראשי מוביל
2. Owners אחרים מתאמים
3. אין חפיפה בביצוע

### 3. Conflicts
בסתירה בין Owners:
- מסמך 09-PRODUCT-SOURCE-OF-TRUTH מנצח

### 4. Status Changes
שינוי סטטוס Feature (Active → Deprecated):
- רק Product Lead
- מתעד ב-09-PRODUCT-SOURCE-OF-TRUTH

---

## Summary by Status

| Status | Count |
|--------|-------|
| Active | 87 |
| Beta | 9 |
| Planned | 3 |
| Frozen | 8 |
| Deprecated | 5 |
| **Total** | **112** |
