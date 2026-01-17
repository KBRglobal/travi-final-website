# Admin Panel - Final Structure

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## עקרון מנחה

```
מ-80+ routes → 6 קטגוריות ברורות
כל role רואה רק מה שרלוונטי לו
פעולות מסוכנות מוגנות
```

---

## 1. Navigation Structure (Final)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRAVI CMS                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📊 Dashboard                                                       │
│                                                                     │
│  📝 CONTENT                                                         │
│  ├── Destinations                                                   │
│  ├── Articles                                                       │
│  ├── Attractions                                                    │
│  ├── Hotels                                                         │
│  ├── Dining                                                         │
│  ├── Events                                                         │
│  ├── Districts                                                      │
│  ├── Real Estate                                                    │
│  ├── Pages                                                          │
│  └── AI Tools                                                       │
│                                                                     │
│  🎯 SEO                                                             │
│  ├── Keywords                                                       │
│  ├── Audit                                                          │
│  ├── AEO                                                            │
│  └── Translations                                                   │
│                                                                     │
│  🖼️ MEDIA                                                           │
│  ├── Library                                                        │
│  └── Image Engine                                                   │
│                                                                     │
│  🔐 GOVERNANCE (Admin only)                                         │
│  ├── Users                                                          │
│  ├── Audit Logs                                                     │
│  └── Security                                                       │
│                                                                     │
│  📈 ANALYTICS                                                       │
│  ├── Overview                                                       │
│  ├── Growth                                                         │
│  ├── SEO Health                                                     │
│  └── Monetization                                                   │
│                                                                     │
│  ⚙️ SYSTEM (Admin only)                                             │
│  ├── Settings                                                       │
│  ├── Navigation                                                     │
│  ├── Automation                                                     │
│  └── Operations                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Routes - Final Map

### 2.1 Dashboard

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin` | Main dashboard | `/admin` | KEEP |

---

### 2.2 CONTENT Category

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/content/destinations` | Destinations hub | `/admin/destinations` | RENAME |
| `/admin/content/destinations/:slug` | Single destination | `/admin/destinations/:slug` | RENAME |
| `/admin/content/articles` | Articles list | `/admin/articles` | RENAME |
| `/admin/content/articles/new` | New article | `/admin/articles/new` | RENAME |
| `/admin/content/articles/:id` | Edit article | `/admin/articles/:id` | RENAME |
| `/admin/content/attractions` | Attractions list | `/admin/attractions` | RENAME |
| `/admin/content/attractions/new` | New attraction | `/admin/attractions/new` | RENAME |
| `/admin/content/attractions/:id` | Edit attraction | `/admin/attractions/:id` | RENAME |
| `/admin/content/hotels` | Hotels list | `/admin/hotels` | RENAME |
| `/admin/content/hotels/new` | New hotel | `/admin/hotels/new` | RENAME |
| `/admin/content/hotels/:id` | Edit hotel | `/admin/hotels/:id` | RENAME |
| `/admin/content/dining` | Dining list | `/admin/dining` | RENAME |
| `/admin/content/dining/new` | New dining | `/admin/dining/new` | RENAME |
| `/admin/content/dining/:id` | Edit dining | `/admin/dining/:id` | RENAME |
| `/admin/content/events` | Events list | `/admin/events` | RENAME |
| `/admin/content/events/new` | New event | `/admin/events/new` | RENAME |
| `/admin/content/events/:id` | Edit event | `/admin/events/:id` | RENAME |
| `/admin/content/districts` | Districts list | `/admin/districts`, `/admin/districts/listings` | MERGE |
| `/admin/content/districts/new` | New district | `/admin/districts/new` | RENAME |
| `/admin/content/districts/:id` | Edit district | `/admin/districts/:id` | RENAME |
| `/admin/content/real-estate` | Real estate hub | `/admin/real-estate`, `/admin/off-plan` | MERGE |
| `/admin/content/real-estate/off-plan` | Off-plan list | `/admin/off-plan/listings` | RENAME |
| `/admin/content/real-estate/case-studies` | Case studies | `/admin/case-studies` | RENAME |
| `/admin/content/pages` | Pages hub | NEW | CREATE |
| `/admin/content/pages/landing` | Landing pages | `/admin/landing-pages` | RENAME |
| `/admin/content/pages/static` | Static pages | `/admin/static-pages` | RENAME |
| `/admin/content/pages/homepage` | Homepage editor | `/admin/homepage` | RENAME |
| `/admin/content/ai-tools` | AI tools hub | NEW | CREATE |
| `/admin/content/ai-tools/generator` | AI generator | `/admin/ai-generator` | RENAME |
| `/admin/content/ai-tools/octopus` | Octopus engine | `/admin/octopus` | RENAME |
| `/admin/content/ai-tools/topics` | Topic bank | `/admin/topic-bank` | RENAME |
| `/admin/content/ai-tools/templates` | Templates | `/admin/templates` | RENAME |
| `/admin/content/ai-tools/writers` | Writers | `/admin/writers` | RENAME |
| `/admin/content/calendar` | Content calendar | `/admin/calendar`, `/admin/scheduling` | MERGE |
| `/admin/content/help` | Help center | `/admin/help` | RENAME |
| `/admin/content/surveys` | Surveys | `/admin/surveys` | RENAME |
| `/admin/content/rss` | RSS feeds | `/admin/rss-feeds` | RENAME |

---

### 2.3 SEO Category

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/seo` | SEO dashboard | NEW | CREATE |
| `/admin/seo/keywords` | Keywords library | `/admin/keywords` | RENAME |
| `/admin/seo/keywords/clusters` | Clusters | `/admin/clusters` | RENAME |
| `/admin/seo/keywords/tags` | Tags | `/admin/tags` | RENAME |
| `/admin/seo/audit` | SEO audit | `/admin/seo-audit` | RENAME |
| `/admin/seo/aeo` | AEO dashboard | `/admin/aeo` | RENAME |
| `/admin/seo/translations` | Translations | `/admin/translations` | RENAME |
| `/admin/seo/intelligence` | Content intelligence | `/admin/content-intelligence`, `/admin/destination-intelligence` | MERGE |

---

### 2.4 MEDIA Category

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/media` | Media dashboard | NEW | CREATE |
| `/admin/media/library` | Media library | `/admin/media` | KEEP |
| `/admin/media/images` | Image engine | `/admin/image-engine` | RENAME |

---

### 2.5 GOVERNANCE Category (Admin Only)

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/governance` | Governance hub | NEW | CREATE |
| `/admin/governance/users` | Users list | `/admin/users` | RENAME |
| `/admin/governance/users/:id` | User detail | NEW | CREATE |
| `/admin/governance/audit` | Audit logs | `/admin/audit-logs` | RENAME |
| `/admin/governance/security` | Security settings | `/admin/security` | RENAME |

---

### 2.6 ANALYTICS Category

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/analytics` | Analytics overview | `/admin/analytics` | KEEP |
| `/admin/analytics/growth` | Growth dashboard | `/admin/growth-dashboard` | RENAME |
| `/admin/analytics/seo` | SEO performance | NEW | CREATE |
| `/admin/analytics/journey` | Customer journey | `/admin/analytics/journey` | KEEP |
| `/admin/analytics/search` | Search analytics | `/admin/analytics/search` | KEEP |
| `/admin/analytics/monetization` | Revenue & leads | `/admin/monetization/*`, `/admin/referrals` | MERGE |
| `/admin/analytics/affiliates` | Affiliates | `/admin/affiliate-links`, `/admin/monetization/affiliates` | MERGE |

---

### 2.7 SYSTEM Category (Admin Only)

| New Route | Description | Old Route(s) | Action |
|-----------|-------------|--------------|--------|
| `/admin/system` | System hub | NEW | CREATE |
| `/admin/system/settings` | Settings | `/admin/settings`, `/admin/site-settings` | MERGE |
| `/admin/system/navigation` | Navigation | `/admin/navigation` | RENAME |
| `/admin/system/footer` | Footer | `/admin/footer` | RENAME |
| `/admin/system/automation` | Automation hub | NEW | CREATE |
| `/admin/system/automation/autopilot` | Auto-pilot | `/admin/auto-pilot` | RENAME |
| `/admin/system/automation/rules` | Content rules | `/admin/content-rules` | RENAME |
| `/admin/system/operations` | Operations | `/admin/operations` | RENAME |
| `/admin/system/operations/health` | System health | `/admin/system-health` | RENAME |
| `/admin/system/operations/logs` | Logs | `/admin/logs` | RENAME |
| `/admin/system/operations/qa` | QA dashboard | `/admin/qa` | RENAME |
| `/admin/system/changes` | Change management | `/admin/changes` | RENAME |

---

## 3. Routes to DELETE

| Route | Reason | Redirect To |
|-------|--------|-------------|
| `/admin/site-settings` | Merged with settings | `/admin/system/settings` |
| `/admin/homepage-promotions` | Merged with homepage | `/admin/content/pages/homepage` |
| `/admin/search-debug` | Dev tool, internal only | NONE |
| `/admin/console` | Dev tool, internal only | NONE |
| `/admin/entity-merge` | Internal tool | NONE |
| `/admin/districts/listings` | Merged with districts | `/admin/content/districts` |
| `/admin/off-plan/listings` | Merged | `/admin/content/real-estate/off-plan` |
| `/admin/landing-pages/listings` | Merged | `/admin/content/pages/landing` |
| `/admin/districts/management` | Merged | `/admin/content/districts` |
| `/admin/off-plan/management` | Merged | `/admin/content/real-estate` |
| `/admin/landing-pages/management` | Merged | `/admin/content/pages/landing` |

---

## 4. Routes to INTERNAL-ONLY

Internal-only routes are not visible in navigation but accessible by URL (for power users).

| Route | Reason |
|-------|--------|
| `/admin/intelligence` | Ops dashboard |
| `/admin/social/*` | Beta feature |
| `/admin/writers/newsroom` | Beta feature |
| `/admin/page-builder` | Beta feature |
| `/admin/visual-editor/*` | Beta feature |
| `/admin/chat` | Support tool |
| `/admin/newsletter` | Marketing tool |
| `/admin/campaigns` | Marketing tool |

---

## 5. Frozen Routes (No Changes Allowed)

| Route | Reason |
|-------|--------|
| `/admin/governance/roles` | Enterprise feature |
| `/admin/governance/policies` | Enterprise feature |
| `/admin/governance/approvals` | Enterprise feature |
| `/admin/enterprise/*` | Enterprise feature |

---

## 6. Role-Based Visibility

### What each role sees:

| Category | Admin | Editor | Author | Contributor | Viewer |
|----------|-------|--------|--------|-------------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Content | ✅ Full | ✅ Full | ✅ Limited | ✅ Limited | ❌ |
| SEO | ✅ | ✅ | ❌ | ❌ | ❌ |
| Media | ✅ | ✅ | ✅ | ❌ | ❌ |
| Governance | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ❌ | ❌ | ✅ Read |
| System | ✅ | ❌ | ❌ | ❌ | ❌ |

### Content - Limited access for Author/Contributor:
- Can see: Articles, their own content
- Cannot see: Real Estate, Pages, AI Tools (full)

### Analytics - Read for Viewer:
- Can see: Overview, Growth
- Cannot see: Monetization, Affiliates

---

## 7. Implementation Plan

### Phase 1: Routing (Week 1)
1. Create new route structure in `client/src/App.tsx`
2. Add redirects from old routes
3. Update navigation component
4. Test all routes

### Phase 2: UI Updates (Week 2)
1. Create new hub pages (Content, SEO, Media, etc.)
2. Update sidebar navigation
3. Add role-based filtering
4. Update breadcrumbs

### Phase 3: Cleanup (Week 3)
1. Remove old route handlers
2. Delete unused components
3. Update documentation
4. Final testing

---

## 8. Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Admin Routes | 80+ | 52 | -35% |
| Top-level Categories | 15+ | 6 | -60% |
| Duplicate Routes | 12 | 0 | -100% |
| Internal-only Routes | 0 | 10 | New |
| Frozen Routes | 0 | 8 | Protected |

---

## 9. File Changes Required

### New Files to Create

```
client/src/pages/admin/
├── content/
│   ├── index.tsx           # Content hub
│   ├── pages/
│   │   └── index.tsx       # Pages hub
│   ├── ai-tools/
│   │   └── index.tsx       # AI tools hub
│   └── real-estate/
│       └── index.tsx       # Real estate hub
├── seo/
│   └── index.tsx           # SEO hub
├── media/
│   └── index.tsx           # Media hub
├── governance/
│   └── index.tsx           # Governance hub
├── analytics/
│   └── monetization.tsx    # Monetization merged
└── system/
    ├── index.tsx           # System hub
    └── automation/
        └── index.tsx       # Automation hub
```

### Files to Delete

```
client/src/pages/admin/
├── site-settings.tsx       # Merged
├── homepage-promotions.tsx # Merged
├── search-debug.tsx        # Internal
├── console.tsx             # Internal
├── entity-merge.tsx        # Internal
└── districts-management.tsx # Merged
```

### Files to Rename/Move

All files follow the new structure above.

---

## 10. Backward Compatibility

All old routes will redirect to new routes for 90 days:

```typescript
// Example redirects
{ from: '/admin/articles', to: '/admin/content/articles' }
{ from: '/admin/keywords', to: '/admin/seo/keywords' }
{ from: '/admin/media', to: '/admin/media/library' }
// etc.
```

After 90 days, old routes will return 404.
