# TRAVI Programmatic SEO Strategy

_Created: 2026-01-28_
_Goal: Scale to 50,000+ indexed pages through templated, data-driven content_

---

## Opportunity Analysis

### Current Assets

- 17 destinations
- 3,000+ attractions in database
- Multilingual capability (16+ languages)
- Structured data for each entity
- AI content generation (OCTYPO)

### Scalable Patterns Identified

| Pattern               | Formula                             | Potential Pages | Search Volume |
| --------------------- | ----------------------------------- | --------------- | ------------- |
| Attraction Pages      | `/{city}/attractions/{name}`        | 3,000+          | High per page |
| Things to Do          | `/things-to-do-in-{city}`           | 17              | Very High     |
| Best X in City        | `/best-{category}-in-{city}`        | 170+            | High          |
| City Comparison       | `/{city-a}-vs-{city-b}`             | 136             | Medium        |
| Neighborhood          | `/{city}/neighborhoods/{name}`      | 200+            | Medium        |
| Events by Month       | `/{city}/events/{month}-{year}`     | 204             | Medium        |
| Attraction Comparison | `/{attraction-a}-vs-{attraction-b}` | 500+            | Medium        |
| Language Variants     | `/{lang}/{city}/...`                | 16x multiplier  | Varies        |

**Total Potential: 50,000+ unique pages**

---

## Priority Playbooks for TRAVI

### Playbook 1: Attraction Pages (Existing - Enhance)

**Pattern:** `/{city}/attractions/{slug}`
**Volume:** 3,000+ pages
**Priority:** HIGH - Already exists, needs optimization

**Current State:** Pages exist but may lack depth
**Enhancement:**

- Add HowTo schema for "How to visit"
- Add comparison to nearby attractions
- Add seasonal recommendations
- Add FAQ section per attraction

### Playbook 2: "Things to Do" Hub Pages

**Pattern:** `/things-to-do-in-{city}`
**Volume:** 17 pages (expandable)
**Priority:** HIGH - Very high search volume

**Template Structure:**

```
/things-to-do-in-dubai
├── Top 10 Must-See Attractions
├── Free Things to Do
├── Things to Do with Kids
├── Things to Do at Night
├── Things to Do When It Rains
└── Seasonal Activities
```

### Playbook 3: "Best X in City" Category Pages

**Pattern:** `/best-{category}-in-{city}`
**Volume:** 170+ pages (10 categories × 17 cities)
**Priority:** HIGH - High-intent, curated lists

**Categories:**

- best-restaurants-in-{city}
- best-hotels-in-{city}
- best-museums-in-{city}
- best-shopping-in-{city}
- best-nightlife-in-{city}
- best-beaches-in-{city}
- best-parks-in-{city}
- best-viewpoints-in-{city}
- best-day-trips-from-{city}
- best-hidden-gems-in-{city}

### Playbook 4: City Comparison Pages

**Pattern:** `/{city-a}-vs-{city-b}`
**Volume:** 136 pages (C(17,2) combinations)
**Priority:** MEDIUM - Decision-stage content

**Focus on logical comparisons:**

- Dubai vs Abu Dhabi (nearby)
- Paris vs London (Europe rivals)
- Tokyo vs Singapore (Asia hubs)
- New York vs Los Angeles (US cities)
- Barcelona vs Rome (Mediterranean)

### Playbook 5: Neighborhood Guides

**Pattern:** `/{city}/neighborhoods/{name}`
**Volume:** 200+ pages
**Priority:** MEDIUM - "Where to stay" intent

**Example for Dubai:**

- /dubai/neighborhoods/downtown
- /dubai/neighborhoods/marina
- /dubai/neighborhoods/jumeirah
- /dubai/neighborhoods/deira
- /dubai/neighborhoods/business-bay

### Playbook 6: Monthly Events

**Pattern:** `/{city}/events/{month}-{year}`
**Volume:** 204 pages/year (17 cities × 12 months)
**Priority:** MEDIUM - Fresh content, recurring traffic

---

## Implementation Plan

### Phase 1: Foundation (Month 1-2)

**Focus:** Enhance existing attraction pages

1. Audit current 3,000+ attraction pages
2. Add missing schema markup
3. Implement FAQ sections
4. Add "nearby attractions" component
5. Improve internal linking

**Target:** 100% of attraction pages optimized

### Phase 2: Hub Pages (Month 2-3)

**Focus:** Create "Things to Do" pages

1. Build template for hub pages
2. Create 17 main hub pages
3. Create category sub-pages (85 pages)
4. Interlink with attraction pages

**Target:** 100+ new hub pages

### Phase 3: Category Lists (Month 3-4)

**Focus:** "Best X in City" pages

1. Build curation template
2. Generate 170 category pages
3. Add editorial introductions
4. Include affiliate-optimized attraction cards

**Target:** 170+ category pages

### Phase 4: Comparison Content (Month 4-5)

**Focus:** City and attraction comparisons

1. Build comparison template
2. Create top 50 city comparisons
3. Create top 100 attraction comparisons
4. Add decision-helper components

**Target:** 150+ comparison pages

### Phase 5: Localization (Month 5-6)

**Focus:** Multilingual expansion

1. Prioritize top 5 languages (ES, FR, DE, JA, ZH)
2. Translate hub pages first
3. Then category pages
4. Then attraction pages

**Target:** 5x content through translation

---

## Page Templates

### Template 1: Attraction Page

```
URL: /{city}/attractions/{slug}

Title: {Attraction Name} Tickets & Visitor Guide 2026 | TRAVI

H1: {Attraction Name}

Sections:
1. Hero with key facts (hours, price, duration)
2. Why Visit (unique intro)
3. What to Expect
4. Tickets & Skip-the-Line [affiliate]
5. Best Time to Visit
6. How to Get There
7. Insider Tips
8. Nearby Attractions [internal links]
9. FAQ [schema markup]

Schema: TouristAttraction, Place, FAQPage, BreadcrumbList
```

### Template 2: Things to Do Hub

```
URL: /things-to-do-in-{city}

Title: 50 Best Things to Do in {City} 2026 | TRAVI

H1: Things to Do in {City}

Sections:
1. Intro (why visit, what makes it special)
2. Top 10 Must-See Attractions
3. Category Quick Links
4. Free Things to Do
5. Things to Do with Kids
6. Things to Do at Night
7. Seasonal Highlights
8. Day Trips
9. FAQ

Schema: ItemList, FAQPage, BreadcrumbList
```

### Template 3: Best X in City

```
URL: /best-{category}-in-{city}

Title: 15 Best {Category} in {City} 2026 | TRAVI

H1: Best {Category} in {City}

Sections:
1. Editorial intro (why these selections)
2. Quick picks (top 3 summary)
3. Numbered list with cards
   - Name, image, 2-3 sentence description
   - Key details (hours, price, location)
   - Why we recommend it
4. How we selected these
5. Map view
6. Related categories
7. FAQ

Schema: ItemList, FAQPage, BreadcrumbList
```

### Template 4: City Comparison

```
URL: /{city-a}-vs-{city-b}

Title: {City A} vs {City B}: Which Should You Visit? | TRAVI

H1: {City A} vs {City B}

Sections:
1. Quick verdict (TL;DR)
2. Comparison table
3. Best for [different traveler types]
4. Attractions comparison
5. Cost comparison
6. Weather comparison
7. When to visit each
8. Why not both? (combined trip idea)
9. FAQ

Schema: FAQPage, BreadcrumbList
```

---

## Data Requirements

### For Attraction Pages

- Name, slug, description
- Location (address, coordinates)
- Hours, pricing
- Images (hero, gallery)
- Categories/tags
- Ratings (if available)
- Nearby attractions (calculated)
- FAQ (AI-generated)

### For Category Pages

- Category name
- City
- List of attractions in category
- Sorting criteria (popularity, rating)
- Editorial intro

### For Comparison Pages

- Both cities/attractions
- Comparison metrics
- Winner per category
- Unique strengths of each

---

## Internal Linking Architecture

```
Homepage
├── /destinations (hub)
│   └── /{city} (destination page)
│       ├── /{city}/attractions (list)
│       │   └── /{city}/attractions/{name} (detail)
│       ├── /{city}/neighborhoods/{name}
│       └── /{city}/events/{month}
├── /things-to-do-in-{city} (hub)
│   └── /best-{category}-in-{city}
└── /{city-a}-vs-{city-b}
```

**Linking Rules:**

- Every attraction → parent city
- Every category page → attractions it lists
- Every comparison → both subjects
- Every hub → all children
- Breadcrumbs on all pages

---

## Quality Control

### Unique Value Checklist

- [ ] Page has unique intro (not template text)
- [ ] Data-driven sections populated
- [ ] At least 3 unique data points
- [ ] FAQ with real questions
- [ ] Internal links to related content

### Technical SEO Checklist

- [ ] Unique title tag
- [ ] Unique meta description
- [ ] Proper H1 with keyword
- [ ] Schema markup valid
- [ ] Images optimized
- [ ] Page loads < 3 seconds

### Anti-Thin Content Rules

- Minimum 500 words unique content
- At least 5 internal links
- At least 1 image with alt text
- Must answer search intent
- No duplicate paragraphs across pages

---

## Indexation Strategy

### Priority Tiers

**Tier 1 (Immediate Index):**

- Destination hub pages
- Top 100 attractions
- Things to do hub pages
- Main category pages

**Tier 2 (Monitor & Index):**

- All attraction pages
- Neighborhood pages
- City comparisons

**Tier 3 (Quality Gate):**

- Attraction comparisons (only if unique value)
- Monthly events (current + next 3 months)
- Long-tail variations

### Sitemap Structure

```
/sitemap.xml (index)
├── /sitemap-destinations.xml
├── /sitemap-attractions.xml
├── /sitemap-categories.xml
├── /sitemap-comparisons.xml
└── /sitemap-events.xml
```

---

## Success Metrics

| Metric            | Month 1  | Month 3 | Month 6 |
| ----------------- | -------- | ------- | ------- |
| Pages Created     | 100      | 500     | 2,000   |
| Pages Indexed     | 80%      | 85%     | 90%     |
| Organic Traffic   | Baseline | +50%    | +150%   |
| Avg Position      | -        | Top 20  | Top 10  |
| Featured Snippets | 0        | 10      | 50      |

---

## Risk Mitigation

### Thin Content Risk

**Mitigation:** Minimum content requirements, AI + human review

### Duplicate Content Risk

**Mitigation:** Unique intros, conditional sections, canonical tags

### Crawl Budget Risk

**Mitigation:** Priority indexing, clean sitemap, fast pages

### Penalty Risk

**Mitigation:** Quality gates, gradual rollout, monitoring

---

## Next Steps

1. **Technical Setup**
   - Create dynamic route handlers
   - Build template components
   - Set up schema generation

2. **Data Preparation**
   - Audit attraction data completeness
   - Generate FAQs for all attractions
   - Create category mappings

3. **Content Generation**
   - Write editorial intros for categories
   - Generate comparison data
   - Create unique descriptions

4. **Launch Sequence**
   - Start with highest-volume pages
   - Monitor indexation weekly
   - Iterate based on performance

---

_This strategy leverages TRAVI's existing data assets (3,000+ attractions, 17 destinations) to scale to 50,000+ pages while maintaining quality and avoiding penalties._
