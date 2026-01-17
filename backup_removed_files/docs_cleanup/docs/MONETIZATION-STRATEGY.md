# TRAVI Monetization Strategy

## Overview

This document outlines the monetization strategy for TRAVI, designed to generate revenue without harming SEO or user experience. All monetization features are disabled by default and require explicit opt-in via the `ENABLE_MONETIZATION` environment variable.

**Last Updated:** 2024-12-31  
**Status:** Planning Phase (Not Active)

---

## Monetizable Surfaces

### 1. Hotels

**Opportunity:** Booking affiliate links and comparison features

| Surface | Type | Priority | SEO Impact |
|---------|------|----------|------------|
| Hotel detail pages | Affiliate booking links | High | None (post-content) |
| "Where to Stay" sections | Comparison widgets | High | None (supplementary) |
| Hotel cards | "Book Now" CTAs | Medium | None (value-add) |
| Email newsletters | Curated hotel deals | Medium | N/A |

**Affiliate Partners (Planned):**
- Booking.com Affiliate Partner Program
- Hotels.com Affiliate Network
- Expedia Partner Solutions
- Agoda Partners
- TripAdvisor Hotel Metasearch

**Implementation Notes:**
- Affiliate links placed AFTER main editorial content
- Clear disclosure: "TRAVI earns a commission on bookings"
- No manipulation of hotel rankings based on commission rates
- User-first: Best hotels featured regardless of affiliate status

---

### 2. Experiences & Activities

**Opportunity:** GetYourGuide, Viator affiliate integration

| Surface | Type | Priority | SEO Impact |
|---------|------|----------|------------|
| Experience listings | Inline recommendations | High | None (in-context) |
| "Things to Do" pages | Bookable activity cards | High | None (value-add) |
| Destination guides | Contextual activity suggestions | Medium | None (supplementary) |
| Itinerary builders | Pre-built tour packages | Medium | None (post-planning) |

**Affiliate Partners (Planned):**
- GetYourGuide Partner Program
- Viator Partner Program
- Klook Affiliate
- Airbnb Experiences (when available)
- Local tour operator partnerships

**Implementation Notes:**
- Experiences integrated naturally within content flow
- "Book this Experience" appears after activity descriptions
- Editorial integrity: Activities recommended on merit, not commission
- Seasonal and availability-aware recommendations

---

### 3. Guides & Premium Content

**Opportunity:** Premium content tiers and download options

| Surface | Type | Priority | SEO Impact |
|---------|------|----------|------------|
| Comprehensive city guides | PDF downloads | Medium | None (gated extra) |
| Offline maps | Premium feature | Medium | None (feature tier) |
| Personalized itineraries | AI-generated plans | High | None (service) |
| Insider tips | Member-exclusive content | Low | Minimal (partial preview) |

**Revenue Models (Planned):**
- **Freemium:** Core content free, premium downloads paid
- **Subscription:** Monthly/annual access to all premium features
- **One-time Purchase:** Individual guide PDFs ($2.99-$9.99)
- **Lead Generation:** Travel agent partnerships for complex trips

**Implementation Notes:**
- Free content remains comprehensive and SEO-optimized
- Premium content is "bonus" material, not paywalled essentials
- Clear value proposition for paid features
- No degradation of free user experience

---

## Commercial-Safe Zones

These are the ONLY locations where commercial content may appear:

### ✅ ALLOWED Zones

| Zone ID | Location | Placement Rules |
|---------|----------|-----------------|
| `hotel-detail-footer` | Hotel detail pages | After main content, before footer |
| `hotel-comparison-widget` | "Where to Stay" sections | Inline, clearly labeled |
| `experience-inline` | Experience listings | Between experience cards |
| `experience-detail-cta` | Experience detail pages | After description, before reviews |
| `article-sidebar` | Article/guide sidebars | Related products widget |
| `article-footer` | Article footer | "Book experiences mentioned" |
| `newsletter-promo` | Email newsletters | Curated deals section |
| `itinerary-booking` | Itinerary pages | "Book this trip" CTAs |

### 🚫 NEVER Zones (Hard Constraints)

| Zone | Reason |
|------|--------|
| Hero sections | UX degradation, brand damage |
| Navigation | UX disruption, trust erosion |
| Search results rankings | SEO manipulation, user trust |
| Above-the-fold content | Page load impact, UX |
| Meta descriptions | SEO spam signals |
| Schema.org markup | SEO integrity |
| Breadcrumbs | Navigation integrity |
| Mobile sticky headers | UX obstruction |

---

## Technical Implementation

### Environment Control

All monetization features are controlled by environment variables:

```bash
# Master switch - ALL monetization features
ENABLE_MONETIZATION=false  # Default: false (disabled)

# Granular controls (only checked if ENABLE_MONETIZATION=true)
ENABLE_HOTEL_AFFILIATES=false
ENABLE_EXPERIENCE_AFFILIATES=false
ENABLE_PREMIUM_CONTENT=false
ENABLE_LEAD_GENERATION=false
```

### Code Structure

```
server/monetization/
├── index.ts              # Main exports
├── commercial-zones.ts   # Zone definitions and validation
├── hooks.ts              # Placeholder hooks (disabled by default)
├── affiliate-injector.ts # Affiliate link injection (existing)
├── commission-calculator.ts # Commission tracking (existing)
├── cta-ab-testing.ts     # CTA optimization (existing)
├── partner-dashboard.ts  # Partner management (existing)
└── payouts.ts            # Payout processing (existing)
```

### Validation Rules

1. **Zone Validation:** Content can only be injected into approved zones
2. **SEO Guard:** No affiliate parameters on canonical URLs
3. **Disclosure Requirement:** All affiliate content must be labeled
4. **Rate Limiting:** Maximum 3 commercial placements per page
5. **A/B Testing:** All commercial changes require statistical validation

---

## SEO Protection Measures

### URL Handling

```typescript
// SEO-critical pages: NO affiliate tracking
const SEO_CRITICAL_PATHS = [
  '/',                    // Homepage
  '/destinations/*',      // Destination landing pages
  '/guides/*',            // Editorial guides
  '/search',              // Search results
];

// Affiliate tracking allowed ONLY via:
// 1. rel="nofollow sponsored" links
// 2. Redirect through /go/{partner}/{id}
// 3. Client-side click tracking (no URL modification)
```

### Schema.org Integrity

- Never inject affiliate metadata into structured data
- Maintain separation between editorial and commercial content
- Product schema only for genuine product reviews

### Crawl Budget Protection

- Affiliate redirect pages blocked in robots.txt
- No internal links to affiliate redirect pages
- Proper canonicalization on all pages

---

## Disclosure Requirements

### FTC/ASA Compliance

All affiliate content must include:

1. **Visual Label:** "Partner" or "Sponsored" badge
2. **Proximity Disclosure:** Near the commercial element
3. **Footer Disclosure:** Link to full affiliate disclosure page
4. **Clear Language:** "We earn a commission on bookings"

### Implementation

```typescript
// Every affiliate link must include:
{
  disclosure: true,
  disclosureText: "Affiliate link - we may earn a commission",
  nofollow: true,
  sponsored: true,
}
```

---

## Revenue Projections (Planning)

| Channel | Year 1 Target | Commission Rate | Notes |
|---------|---------------|-----------------|-------|
| Hotel Bookings | $50,000 | 4-8% | Focus on high-value destinations |
| Experiences | $25,000 | 8-12% | GetYourGuide/Viator |
| Premium Content | $10,000 | 100% margin | PDF guides, memberships |
| Lead Generation | $15,000 | Per-lead | Complex trip planning |

**Total Year 1 Target:** $100,000

---

## Rollout Plan

### Phase 1: Infrastructure (Current)
- [x] Create monetization module structure
- [x] Define commercial-safe zones
- [x] Implement env-based feature flags
- [ ] Build affiliate link redirect system

### Phase 2: Hotel Affiliates
- [ ] Booking.com integration
- [ ] Hotels.com integration
- [ ] Hotel detail page placements
- [ ] A/B test conversion rates

### Phase 3: Experience Affiliates
- [ ] GetYourGuide API integration
- [ ] Viator API integration
- [ ] Inline experience recommendations
- [ ] Activity detail page CTAs

### Phase 4: Premium Content
- [ ] PDF guide generation
- [ ] Payment integration (Stripe)
- [ ] Member account system
- [ ] Subscription management

---

## Metrics & Monitoring

### Key Performance Indicators

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Affiliate conversion rate | >2% | <1% |
| User satisfaction (NPS) | >40 | <30 |
| Page load impact | <100ms | >200ms |
| SEO rankings | No change | Any drop |
| Bounce rate change | <5% increase | >10% increase |

### Monitoring Dashboard

Track via PostHog/Analytics:
- Affiliate click-through rates
- Booking completion rates
- Revenue per visitor
- User journey impact
- SEO ranking changes

---

## Governance

### Approval Process

1. **New Partner:** Requires product team approval
2. **New Zone:** Requires SEO team sign-off
3. **UI Changes:** Requires design team review
4. **A/B Tests:** Minimum 2-week run, 95% confidence

### Review Schedule

- Weekly: Revenue and conversion metrics
- Monthly: UX impact assessment
- Quarterly: Partner performance review
- Annually: Strategy refresh

---

## Appendix: Partner Requirements

### Minimum Partner Standards

- Established reputation (5+ years)
- Reliable API/tracking
- Competitive commission rates
- No deceptive practices
- GDPR/privacy compliance
- Real-time availability data

### Exclusion Criteria

- Predatory pricing practices
- Poor user reviews (<3.5 stars)
- Unreliable tracking/attribution
- Non-compliance with disclosure requirements
