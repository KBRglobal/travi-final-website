# Octypo Magic Specification
## Universal Magic Button System for Travi Admin Panel

> **Vision:** Every field in the admin panel has a Magic button. One click = AI fills the field intelligently based on context.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Magic Button Component](#magic-button-component)
3. [Field Specifications by Section](#field-specifications)
4. [Context Dependencies](#context-dependencies)
5. [API Endpoints](#api-endpoints)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL UI                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  [Field Label]                              [✨ Magic]  ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │  Field Value                                        │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              OCTYPO MAGIC ENGINE                        ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             ││
│  │  │ Context   │ │ AI        │ │ Validator │             ││
│  │  │ Collector │→│ Generator │→│ & Fixer   │             ││
│  │  └───────────┘ └───────────┘ └───────────┘             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Magic Button Component

```typescript
// client/src/components/magic-button.tsx

interface MagicButtonProps {
  fieldId: string;                    // Unique field identifier
  fieldType: MagicFieldType;          // What kind of content to generate
  context: MagicContext;              // Data from other fields
  onResult: (value: any) => void;     // Callback with generated value
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

type MagicFieldType =
  // Text fields
  | 'title'
  | 'headline'
  | 'subtitle'
  | 'description'
  | 'summary'
  | 'tldr'
  | 'body_content'

  // SEO fields
  | 'meta_title'
  | 'meta_description'
  | 'slug'
  | 'keywords'
  | 'alt_text'

  // Tourism specific
  | 'coordinates'
  | 'address'
  | 'price_range'
  | 'opening_hours'
  | 'amenities'
  | 'highlights'
  | 'tips'
  | 'transport_info'

  // Social
  | 'social_facebook'
  | 'social_twitter'
  | 'social_instagram'
  | 'push_notification'
  | 'newsletter_subject'

  // Complex
  | 'faqs'
  | 'sections'
  | 'gallery_images'
  | 'related_items';

interface MagicContext {
  contentType: 'destination' | 'hotel' | 'attraction' | 'restaurant' | 'article' | 'news' | 'event' | 'page';
  entityName?: string;                // "Sofia", "Marriott Dubai", etc.
  parentDestination?: string;         // For hotels/attractions
  existingFields: Record<string, any>; // All other filled fields
  locale?: string;
}
```

---

## Field Specifications

### 1. DESTINATIONS

#### 1.1 Create New Destination (`/admin/destinations/new`)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Destination Name | `title` | - | Not needed (user input) |
| Country | `auto_detect` | name | Detect country from destination name |
| Destination Level | `auto_detect` | name | Determine if city/country/area |

#### 1.2 Destination Hub - Hero Tab (`/admin/destinations/:slug`)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Hero Title | `headline` | destination.name, destination.country | Generate compelling headline: "Discover Sofia: Where East Meets West" |
| Hero Subtitle | `subtitle` | destination.name, heroTitle | Generate supporting text: "Ancient history, vibrant culture, and mountain adventures await" |
| Mood Vibe | `auto_generate` | destination.name | Research and determine mood: "Historic & Cultural" |
| Tagline | `tagline` | destination.name, moodVibe | Generate short tagline: "The Hidden Gem of the Balkans" |
| Primary Color | `color_extract` | heroImages | Extract dominant color from hero images |

**Magic All for Hero Tab:**
```typescript
{
  heroTitle: "Discover {destination}: {unique_selling_point}",
  heroSubtitle: "{2-3 sentence description of experience}",
  moodVibe: "{detected_mood}",
  tagline: "{5-7 word catchy phrase}",
  primaryColor: "{extracted_hex_color}"
}
```

#### 1.3 Destination Hub - Mobility Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Transport Overview | `description` | destination.name | Research and describe public transport system |
| Transport Modes | `list_research` | destination.name | Find all transport modes with details |
| Transit Card Name | `research_single` | destination.name | Find local transit card name |
| Contactless Payments | `boolean_research` | destination.name | Check if contactless accepted |
| Official Apps | `list_research` | destination.name | Find official transport apps |
| Taxi Apps | `list_research` | destination.name | Find available ride-hailing apps |
| Taxi Info | `description` | destination.name | Describe official taxi situation |
| Airport Code | `research_single` | destination.name | Find main airport IATA code |
| Airport Name | `research_single` | airportCode | Get full airport name |
| Best Airport Option | `research_single` | destination.name, airportCode | Best way from airport to center |
| Bike Share Name | `research_single` | destination.name | Find bike share system name |
| E-scooters Available | `boolean_research` | destination.name | Check e-scooter availability |
| Walkability Summary | `description` | destination.name | Describe walking conditions |
| Best Walking Areas | `list_research` | destination.name | Find best areas to walk |

**Magic All for Mobility Tab:**
- Research all transport information for destination
- Fill all fields in one API call
- Source from Wikipedia, official tourism sites, Google Maps

#### 1.4 Destination Hub - SEO Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Meta Title | `meta_title` | destination.name, primaryKeyword | Generate SEO title: "Sofia Travel Guide 2026 \| Best Things to Do \| Travi" (≤60 chars) |
| Meta Description | `meta_description` | destination.name, heroSubtitle | Generate SEO description (120-160 chars) |
| Primary Keyword | `keyword_research` | destination.name | Suggest best primary keyword |
| Secondary Keywords | `keywords` | destination.name, primaryKeyword | Generate LSI keywords list |

---

### 2. HOTELS

#### 2.1 Hotel Editor (to be created)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Name | - | - | User input |
| Slug | `slug` | name | Generate: "marriott-sofia-hotel" |
| Description | `body_content` | name, destination, starRating | Generate 500-800 word hotel description |
| Star Rating | `research_single` | name | Look up actual star rating |
| Address | `research_single` | name | Look up full address |
| Coordinates | `coordinates` | name OR address | Get lat/lng from Google Maps |
| Price Range | `price_research` | name | Research average nightly rate |
| Amenities | `list_research` | name | Get list of hotel amenities |
| Check-in Time | `research_single` | name | Find check-in time |
| Check-out Time | `research_single` | name | Find check-out time |
| Meta Title | `meta_title` | name, destination, starRating | "Marriott Sofia \| 5-Star Luxury Hotel 2026 \| Book Now" |
| Meta Description | `meta_description` | name, description | SEO description (150-160 chars) |
| Hero Image | `image_search` | name | Search Unsplash/hotel's images |
| Alt Text | `alt_text` | name, heroImage | Generate descriptive alt text |
| Highlights | `list_generate` | name, amenities, description | Generate 5-7 key highlights |
| FAQs | `faqs` | name, all_fields | Generate 5-8 common questions |
| Social Facebook | `social_facebook` | name, highlights | Generate FB post |
| Social Twitter | `social_twitter` | name, highlights | Generate tweet with hashtags |
| Booking Link | `affiliate_link` | name | Generate Booking.com affiliate link |

**Magic All for Hotel:**
- Input: Just hotel name
- Output: ALL fields filled
- Sources: Google Places API, Booking.com, TripAdvisor, hotel website

---

### 3. ATTRACTIONS

#### 3.1 Attraction Editor / Tiqets Detail (`/admin/tiqets/attractions/:id`)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Page Title | `headline` | name | Generate H1: "Burj Khalifa: Complete Visitor Guide 2026" |
| Description | `body_content` | name, destination | Generate detailed description (600-1000 words) |
| Highlights | `list_generate` | name | Generate 5-7 key highlights |
| What's Included | `list_research` | name, ticketType | List inclusions |
| What's Not Included | `list_research` | name, ticketType | List exclusions |
| URL Slug | `slug` | name | Generate SEO-friendly slug |
| Meta Title | `meta_title` | name, destination | SEO title (≤60 chars) |
| Meta Description | `meta_description` | name, highlights | SEO description (150-160 chars) |
| Introduction | `intro_paragraph` | name, description | Opening paragraph for AEO |
| Why Visit | `persuasive_content` | name, highlights | Reasons to visit |
| Pro Tip | `tip_generate` | name | Insider tip |
| What to Expect | `structured_list` | name | Timeline/experience breakdown |
| Visitor Tips | `tips_list` | name | Practical visitor tips |
| How to Get There | `directions` | name, coordinates | Transport options |
| Answer Capsule | `tldr` | name, all_fields | One-sentence answer for AI |
| FAQs | `faqs` | name, all_fields | Generate 5-10 FAQs |

**Magic All for Attraction:**
```
Input: "Burj Khalifa"
→ Octypo researches everything
→ All 20+ fields filled
→ SEO optimized
→ AEO ready (FAQs, answer capsule)
→ Ready to publish
```

---

### 4. RESTAURANTS

#### 4.1 Restaurant Editor (to be created)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Name | - | - | User input |
| Slug | `slug` | name | Generate slug |
| Cuisine Type | `research_single` | name | Detect cuisine type |
| Description | `body_content` | name, cuisine, destination | Generate description |
| Address | `research_single` | name | Look up address |
| Coordinates | `coordinates` | name OR address | Get lat/lng |
| Price Level | `research_single` | name | Research price level (€-€€€€) |
| Opening Hours | `hours_research` | name | Get opening hours |
| Phone | `research_single` | name | Find phone number |
| Website | `research_single` | name | Find official website |
| Signature Dishes | `list_research` | name | Research popular dishes |
| Atmosphere | `description` | name | Describe ambiance |
| Meta Title | `meta_title` | name, cuisine, destination | SEO title |
| Meta Description | `meta_description` | name, signatureDishes | SEO description |
| Hero Image | `image_search` | name | Search for restaurant images |
| Alt Text | `alt_text` | name, heroImage | Generate alt text |
| Reservation Link | `link_research` | name | Find reservation link |
| FAQs | `faqs` | name, all_fields | Generate FAQs |

---

### 5. ARTICLES

#### 5.1 Article Editor (to be created)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Title | `headline` | topic | Generate compelling title |
| Slug | `slug` | title | Generate from title |
| Summary/Excerpt | `summary` | title, body | Generate 2-3 sentence summary |
| Body Content | `body_content` | title, destination, keywords | Generate full article (1500-3000 words) |
| TLDR | `tldr` | title, body | Generate 3-4 bullet points |
| Primary Keyword | `keyword_research` | title | Suggest primary keyword |
| Secondary Keywords | `keywords` | title, primaryKeyword | Generate LSI keywords |
| Meta Title | `meta_title` | title, primaryKeyword | SEO title (≤60 chars) |
| Meta Description | `meta_description` | title, summary | SEO description (150-160 chars) |
| Hero Image | `image_search` | title, destination | Search relevant image |
| Alt Text | `alt_text` | title, heroImage | Generate alt text |
| Internal Links | `internal_links` | body | Suggest internal link placements |
| FAQs | `faqs` | title, body | Generate relevant FAQs |
| Table of Contents | `toc_generate` | body | Generate from H2/H3 headings |
| Social Facebook | `social_facebook` | title, summary | Generate FB post |
| Social Twitter | `social_twitter` | title, summary | Generate tweet |
| Category | `auto_categorize` | title, body | Suggest best category |
| Tags | `auto_tag` | title, body | Suggest relevant tags |

---

### 6. NEWS ARTICLES

#### 6.1 News Editor (to be created)

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Headline | `news_headline` | originalSource, topic | Generate news headline |
| Headline Variants | `headline_variants` | headline | Generate SEO/Viral/AEO versions |
| Slug | `slug` | headline | Generate from headline |
| Body | `news_body` | originalSource, headline | Rewrite news content |
| TLDR | `tldr` | body | Generate 3-4 bullets |
| Story Tier | `auto_tier` | body, scores | Classify as S1/S2/S3 |
| Meta Title | `meta_title` | headline | SEO title |
| Meta Description | `meta_description` | headline, tldr | SEO description |
| Destination | `entity_extract` | body | Extract mentioned destination |
| Coordinates | `coordinates` | destination | Get coordinates |
| Tourist Type | `auto_classify` | body | Classify target audience |
| FAQs | `faqs` | headline, body | Generate FAQs |
| Social Facebook | `social_facebook` | headline, tldr | Generate FB post |
| Social Twitter | `social_twitter` | headline | Generate tweet |
| Push Notification | `push_notification` | headline | Generate push text |
| Newsletter Subject | `newsletter_subject` | headline | Generate email subject |

---

### 7. HOMEPAGE EDITOR

#### 7.1 SEO Meta Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Meta Title | `meta_title` | siteName | Generate homepage SEO title |
| Meta Description | `meta_description` | siteName, tagline | Generate homepage description |
| Meta Keywords | `keywords` | siteName | Generate relevant keywords |
| OG Title | `og_title` | metaTitle | Generate social title |
| OG Description | `og_description` | metaDescription | Generate social description |

#### 7.2 Hero Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Slide Headline | `headline` | destination, slideIndex | Generate slide headline |
| Slide Subheadline | `subtitle` | headline | Generate supporting text |
| CTA Text | `cta_text` | destination | Generate CTA: "Explore Sofia" |
| CTA Link | `auto_link` | destination | Generate link to destination |
| Image Alt | `alt_text` | destination, image | Generate alt text |

#### 7.3 Sections Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Section Title | `section_title` | sectionKey | Generate section title |
| Section Subtitle | `subtitle` | title | Generate subtitle |

#### 7.4 CTA Tab

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Headline | `cta_headline` | - | Generate compelling CTA headline |
| Subheadline | `subtitle` | headline | Generate supporting text |
| Button Text | `cta_text` | - | Generate button text |
| Helper Text | `helper_text` | - | Generate helper/trust text |

---

### 8. SITE SETTINGS

#### 8.1 Branding

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Site Tagline | `tagline` | siteName | Generate tagline |
| Brand Description | `description` | siteName, tagline | Generate brand description |

#### 8.2 SEO

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Default Meta Title | `meta_title` | siteName | Generate default title template |
| Default Meta Description | `meta_description` | siteName, tagline | Generate default description |

---

### 9. RSS FEEDS

#### 9.1 Add Feed Dialog

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Feed Name | `auto_detect` | feedUrl | Extract name from feed metadata |
| Category | `auto_categorize` | feedUrl, feedContent | Detect category from content |
| Target Destination | `entity_extract` | feedUrl, feedName | Detect destination from feed |

---

### 10. MEDIA LIBRARY

#### 10.1 Image Management

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Alt Text | `alt_text` | image | Analyze image and generate alt text |
| Caption | `caption` | image, altText | Generate descriptive caption |
| Tags | `image_tags` | image | Generate relevant tags |
| Title | `image_title` | image, context | Generate SEO-friendly title |

---

### 11. SOCIAL & MARKETING

#### 11.1 Social Posts

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Facebook Text | `social_facebook` | content, contentType | Generate FB post |
| Twitter Text | `social_twitter` | content | Generate tweet with hashtags |
| Instagram Caption | `social_instagram` | content, image | Generate IG caption with hashtags |
| LinkedIn Text | `social_linkedin` | content | Generate professional post |
| Hashtags | `hashtags` | content, platform | Generate platform-specific hashtags |

#### 11.2 Newsletter

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Subject Line | `newsletter_subject` | content | Generate email subject |
| Preheader | `preheader` | subject | Generate preheader text |
| Body Content | `newsletter_body` | content, subject | Generate email body |

#### 11.3 Push Notifications

| Field | Magic Type | Context Required | Magic Action |
|-------|-----------|------------------|--------------|
| Title | `push_title` | content | Generate push title (≤50 chars) |
| Body | `push_body` | content, title | Generate push body (≤100 chars) |

---

## Context Dependencies

### How Context Flows

```typescript
// Example: Generating hotel meta description
const context: MagicContext = {
  contentType: 'hotel',
  entityName: 'Marriott Sofia',
  parentDestination: 'Sofia, Bulgaria',
  existingFields: {
    name: 'Marriott Sofia',
    starRating: 5,
    description: '...',
    highlights: ['Pool', 'Spa', 'Restaurant'],
    priceRange: '€€€€'
  }
};

// Magic uses this context to generate:
// "Book Marriott Sofia, a 5-star luxury hotel in Sofia with pool, spa & fine dining. Best rates guaranteed."
```

### Context Priority

1. **Entity Name** - Most important, required for research
2. **Parent Destination** - For location context
3. **Existing Fields** - Use filled fields to improve generation
4. **Content Type** - Determines tone and structure

---

## API Endpoints

### Single Field Magic

```typescript
POST /api/octypo/magic/field
{
  fieldType: "meta_title",
  context: {
    contentType: "hotel",
    entityName: "Marriott Sofia",
    existingFields: { ... }
  }
}

Response:
{
  success: true,
  value: "Marriott Sofia Hotel 2026 | 5-Star Luxury | Book Now",
  confidence: 0.92,
  alternatives: [
    "5-Star Marriott Sofia | Luxury Hotel in Bulgaria",
    "Marriott Sofia | Best Luxury Hotel Deals 2026"
  ]
}
```

### Magic All (Full Form)

```typescript
POST /api/octypo/magic/all
{
  contentType: "hotel",
  input: "Marriott Sofia",
  mode: "full", // quick | full | premium
  excludeFields: ["name"] // Don't overwrite these
}

Response:
{
  success: true,
  fields: {
    slug: "marriott-sofia-hotel",
    description: "...",
    starRating: 5,
    address: "...",
    coordinates: { lat: 42.6883, lng: 23.3186 },
    // ... all fields
  },
  metadata: {
    sources: ["Google Places", "Booking.com"],
    confidence: 0.89,
    tokensUsed: 4521,
    processingTimeMs: 3200
  }
}
```

### Batch Magic (Multiple Fields)

```typescript
POST /api/octypo/magic/batch
{
  contentType: "destination",
  entityName: "Sofia",
  fields: ["heroTitle", "heroSubtitle", "metaTitle", "metaDescription"]
}

Response:
{
  success: true,
  fields: {
    heroTitle: "Discover Sofia: Eastern Europe's Hidden Capital",
    heroSubtitle: "Ancient Roman ruins, Orthodox churches, and vibrant nightlife",
    metaTitle: "Sofia Travel Guide 2026 | Best Things to Do | Travi",
    metaDescription: "Plan your Sofia trip with our complete guide..."
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Magic Button React component
- [ ] Octypo Magic Engine (server)
- [ ] Single field API endpoint
- [ ] Context collection utilities

### Phase 2: Destinations
- [ ] Destination Hub - Hero tab fields
- [ ] Destination Hub - Mobility tab fields
- [ ] Destination Hub - SEO tab fields
- [ ] Magic All for destinations

### Phase 3: Content Types
- [ ] Hotels - all fields
- [ ] Attractions - all fields
- [ ] Restaurants - all fields
- [ ] Articles - all fields

### Phase 4: News & Marketing
- [ ] News articles - all fields
- [ ] Social posts - all fields
- [ ] Newsletter - all fields
- [ ] Push notifications

### Phase 5: Site-wide
- [ ] Homepage editor
- [ ] Site settings
- [ ] Media library
- [ ] RSS feeds

### Phase 6: Translations
- [ ] Magic Translate for all content types
- [ ] Batch translation support
- [ ] SEO preservation in translations

---

## Field Count Summary

| Section | Total Fields | Magic-Enabled Fields |
|---------|--------------|---------------------|
| Destinations | 35+ | 33 |
| Hotels | 25+ | 24 |
| Attractions | 25+ | 24 |
| Restaurants | 22+ | 21 |
| Articles | 20+ | 19 |
| News | 20+ | 19 |
| Homepage | 30+ | 28 |
| Site Settings | 15+ | 12 |
| Media | 5+ | 5 |
| Social/Marketing | 15+ | 15 |
| **TOTAL** | **210+** | **200+** |

---

## Notes

1. **User Input Fields**: Some fields like "Name" are intentionally NOT magic-enabled (user provides the seed)
2. **Read-Only Fields**: Fields like scores, status badges are display-only
3. **Toggle Fields**: Boolean fields use `boolean_research` to determine true/false
4. **Array Fields**: Lists use `list_research` or `list_generate` to populate
5. **Validation**: All magic output runs through validation before setting field value
