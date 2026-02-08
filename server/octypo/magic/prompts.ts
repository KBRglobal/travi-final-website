/**
 * Octypo Magic Engine - AI Prompts
 *
 * Prompts for each field type incorporating:
 * - SEO optimization rules from seo-audit skill
 * - Copywriting best practices from copywriting skill
 * - Social content formulas from social-content skill
 */

import { BANNED_PHRASES } from "./validators";

// ============================================================================
// Types
// ============================================================================

export interface PromptContext {
  entityName: string;
  entityType: string;
  destination?: string;
  category?: string;
  existingTitle?: string;
  existingDescription?: string;
  keywords?: string[];
  targetAudience?: string[];
  tone?: "professional" | "friendly" | "luxury" | "adventurous" | "informative";
  locale?: string;
  additionalContext?: Record<string, unknown>;
}

export type FieldType =
  | "title"
  | "description"
  | "metaTitle"
  | "metaDescription"
  | "slug"
  | "coordinates"
  | "faqs"
  | "socialFacebook"
  | "socialTwitter"
  | "highlights"
  | "amenities"
  | "priceRange";

// ============================================================================
// Base Prompt Templates
// ============================================================================

const SYSTEM_BASE = `You are an expert content writer for TRAVI, a premium travel platform.

CRITICAL RULES:
1. NEVER use these AI-typical phrases: ${BANNED_PHRASES.slice(0, 15).join(", ")}
2. Write in a conversational, authentic tone - like a knowledgeable friend
3. Be specific with numbers, times, and measurements
4. Include honest context and limitations when relevant
5. Use contractions naturally (you'll, it's, don't, won't)
6. Address the reader directly using "you" and "your"
7. Focus on practical value over marketing fluff

ALWAYS return valid JSON. No markdown, no extra text.`;

// ============================================================================
// Title Prompts
// ============================================================================

export function getTitlePrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: SYSTEM_BASE,
    user: `Generate a compelling title for this ${context.entityType}:

Entity: ${context.entityName}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.keywords?.length ? `Keywords to include: ${context.keywords.slice(0, 3).join(", ")}` : ""}
${context.targetAudience?.length ? `Target audience: ${context.targetAudience.join(", ")}` : ""}

Requirements:
- Clear and descriptive (not clickbait)
- 40-80 characters ideal
- Include the entity name
- Make it search-friendly

Return JSON: {"title": "Your generated title"}`,
  };
}

// ============================================================================
// Description Prompts
// ============================================================================

export function getDescriptionPrompt(context: PromptContext): { system: string; user: string } {
  const toneGuide = getToneGuide(context.tone);

  return {
    system: SYSTEM_BASE,
    user: `Generate a compelling description for this ${context.entityType}:

Entity: ${context.entityName}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.existingTitle ? `Title: ${context.existingTitle}` : ""}
${context.keywords?.length ? `Keywords: ${context.keywords.join(", ")}` : ""}
${context.targetAudience?.length ? `Target audience: ${context.targetAudience.join(", ")}` : ""}

Tone: ${toneGuide}

Requirements:
- 100-200 words
- Hook in the first sentence
- Include key selling points
- End with a soft call to action
- Be specific and factual

Return JSON: {"description": "Your generated description"}`,
  };
}

// ============================================================================
// Meta Title Prompts (SEO-focused)
// ============================================================================

export function getMetaTitlePrompt(context: PromptContext): { system: string; user: string } {
  const year = new Date().getFullYear();

  return {
    system: `${SYSTEM_BASE}

SEO RULES FOR META TITLES (from seo-audit skill):
- Maximum 60 characters (Google truncates beyond this)
- Include primary keyword near the beginning
- Include brand separator at end (| TRAVI)
- Current year can boost CTR for travel content
- Power words: Guide, Tips, Best, Complete, Ultimate
- Avoid special characters except | - :`,
    user: `Generate an SEO-optimized meta title for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.keywords?.length ? `Primary keyword: ${context.keywords[0]}` : ""}

Current year: ${year}

Requirements:
- Maximum 60 characters (STRICT)
- Include entity name
- End with " | TRAVI"
- Consider including year if relevant

Return JSON: {"metaTitle": "Your 60-char max title"}`,
  };
}

// ============================================================================
// Meta Description Prompts (SEO-focused)
// ============================================================================

export function getMetaDescriptionPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

SEO RULES FOR META DESCRIPTIONS (from seo-audit skill):
- Optimal length: 150-160 characters
- Include primary keyword naturally
- Include a clear call-to-action
- Preview what the user will find
- Create urgency without being salesy
- Must be unique (never duplicate across pages)`,
    user: `Generate an SEO-optimized meta description for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.existingTitle ? `Page Title: ${context.existingTitle}` : ""}
${context.keywords?.length ? `Keywords: ${context.keywords.slice(0, 3).join(", ")}` : ""}

Requirements:
- EXACTLY 150-160 characters
- Include "${context.entityName}"
- Include a call-to-action (Discover, Explore, Learn, etc.)
- Make it compelling to click

Return JSON: {"metaDescription": "Your 150-160 char description"}`,
  };
}

// ============================================================================
// Slug Prompts
// ============================================================================

export function getSlugPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

URL SLUG BEST PRACTICES:
- Lowercase letters, numbers, hyphens only
- No special characters, underscores, or spaces
- Keep short (3-5 words ideal)
- Include primary keyword
- Remove stop words (the, a, an, and, or)
- Be descriptive but concise`,
    user: `Generate an SEO-friendly URL slug for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.keywords?.length ? `Primary keyword: ${context.keywords[0]}` : ""}

Requirements:
- Lowercase, hyphens only
- Include key identifier
- 3-50 characters
- No stop words

Return JSON: {"slug": "your-generated-slug"}`,
  };
}

// ============================================================================
// FAQ Prompts
// ============================================================================

export function getFAQsPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

FAQ WRITING RULES (for AEO - Answer Engine Optimization):
- Questions should match what real users search
- Start questions with: How, What, When, Where, Why, Is, Can, Do
- Answers should be 40-80 words each
- First sentence answers the question directly
- Include specific details (times, prices, requirements)
- End with a helpful tip when appropriate`,
    user: `Generate 8-10 FAQs for this ${context.entityType}:

Entity: ${context.entityName}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.existingDescription ? `Description: ${context.existingDescription.substring(0, 300)}` : ""}
${context.targetAudience?.length ? `Target audience: ${context.targetAudience.join(", ")}` : ""}

Required questions (adapt to entity):
1. Cost/pricing question
2. Best time to visit question
3. Duration/time needed question
4. Booking/reservation question
5. Accessibility question
6. What to expect question
+ 2-4 unique questions specific to this entity

Requirements:
- 8-10 questions total
- 40-80 words per answer
- Direct, helpful answers
- Include specific details

Return JSON: {"faqs": [{"question": "...", "answer": "..."}, ...]}`,
  };
}

// ============================================================================
// Coordinates Prompts
// ============================================================================

export function getCoordinatesPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `You are a geographic data specialist. Your job is to provide accurate coordinates for locations.

IMPORTANT:
- Return the MOST SPECIFIC coordinates possible
- For businesses, return the exact address location
- For landmarks, return the main entrance or center
- Double-check against known reference points
- If uncertain, note the uncertainty`,
    user: `Provide coordinates for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `City/Region: ${context.destination}` : ""}
${context.additionalContext?.address ? `Address: ${String(context.additionalContext.address)}` : ""}

Requirements:
- Latitude: -90 to 90
- Longitude: -180 to 180
- Be as precise as possible
- Use 6 decimal places

Return JSON: {"coordinates": {"lat": 0.000000, "lng": 0.000000}, "confidence": "high|medium|low", "source": "description of how you determined this"}`,
  };
}

// ============================================================================
// Social Content Prompts
// ============================================================================

export function getSocialFacebookPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

FACEBOOK POST FORMULAS (from social-content skill):
- Hook + Value + CTA format
- Optimal length: 40-80 characters for best engagement
- Can go longer for stories (up to 250 chars)
- Ask questions to boost comments
- Include emojis sparingly (1-3 max)
- End with a soft CTA or question`,
    user: `Generate a Facebook post for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.existingDescription ? `Description: ${context.existingDescription.substring(0, 200)}` : ""}
Tone: ${getToneGuide(context.tone)}

Requirements:
- 80-150 characters
- Include 1-2 relevant emojis
- Hook readers in first line
- End with question or CTA
- No hashtag spam

Return JSON: {"facebookContent": "Your Facebook post text"}`,
  };
}

export function getSocialTwitterPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

TWITTER/X POST FORMULAS (from social-content skill):
- Maximum 280 characters (STRICT)
- Use 2-4 relevant hashtags
- Leave room for link (~25 chars)
- Front-load the key message
- Use line breaks for readability
- Include CTA or question`,
    user: `Generate a Twitter/X post for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.existingTitle ? `Title: ${context.existingTitle}` : ""}
Tone: ${getToneGuide(context.tone)}

Requirements:
- Maximum 280 characters (including hashtags)
- Include 2-4 relevant hashtags
- Leave ~30 chars space for link
- Be engaging and shareable
- Include an emoji or two

Return JSON: {"twitterContent": "Your Twitter post with #hashtags"}`,
  };
}

// ============================================================================
// Highlights Prompts
// ============================================================================

export function getHighlightsPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

HIGHLIGHT WRITING (from copywriting skill):
- Lead with benefits, not features
- Be specific with numbers when possible
- Use active, vivid language
- Keep each highlight 5-15 words
- Order from most to least compelling`,
    user: `Generate highlights for this ${context.entityType}:

Entity: ${context.entityName}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.existingDescription ? `Description: ${context.existingDescription.substring(0, 300)}` : ""}

Requirements:
- 5-8 highlights
- Each 5-15 words
- Focus on unique selling points
- Be specific (numbers, details)
- Order by impact

Return JSON: {"highlights": ["Highlight 1", "Highlight 2", ...]}`,
  };
}

// ============================================================================
// Amenities Prompts
// ============================================================================

export function getAmenitiesPrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `${SYSTEM_BASE}

For travel content, amenities should be:
- Factual and verifiable
- Categorized (if many)
- Standardized naming (WiFi not Wi-Fi)
- Include accessibility features
- Note premium/paid amenities`,
    user: `Generate amenities list for this ${context.entityType}:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.category ? `Category: ${context.category}` : ""}
${context.existingDescription ? `Description: ${context.existingDescription.substring(0, 300)}` : ""}
${context.additionalContext?.existingAmenities ? `Current amenities: ${JSON.stringify(context.additionalContext.existingAmenities)}` : ""}

Requirements:
- 8-15 amenities
- Standard naming conventions
- Include accessibility features
- Mark premium features if any
- Be realistic for this type

Return JSON: {"amenities": ["Amenity 1", "Amenity 2", ...]}`,
  };
}

// ============================================================================
// Price Range Prompts
// ============================================================================

export function getPriceRangePrompt(context: PromptContext): { system: string; user: string } {
  return {
    system: `You are a travel pricing expert. Provide realistic price range assessments.

Use standard formats:
- "$" (budget), "$$" (moderate), "$$$" (expensive), "$$$$" (luxury)
- Or descriptive: "Budget-Friendly", "Mid-Range", "Premium", "Luxury"
- Include currency context if regional pricing varies significantly`,
    user: `Assess the price range for:

Entity: ${context.entityName}
Type: ${context.entityType}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.existingDescription ? `Description: ${context.existingDescription.substring(0, 200)}` : ""}
${context.additionalContext?.priceHints ? `Price hints: ${JSON.stringify(context.additionalContext.priceHints)}` : ""}

Requirements:
- Use $ symbols ($ to $$$$) or descriptive terms
- Be realistic for the location
- Consider the target audience

Return JSON: {"priceRange": "$$", "explanation": "Brief reasoning"}`,
  };
}

// ============================================================================
// Batch Generation Prompt
// ============================================================================

export function getBatchGenerationPrompt(
  context: PromptContext,
  fields: FieldType[]
): { system: string; user: string } {
  const fieldDescriptions = fields
    .map(field => {
      switch (field) {
        case "title":
          return "title: 40-80 chars, descriptive, includes entity name";
        case "description":
          return "description: 100-200 words, compelling, specific";
        case "metaTitle":
          return "metaTitle: EXACTLY 50-60 chars, ends with ' | TRAVI'";
        case "metaDescription":
          return "metaDescription: EXACTLY 150-160 chars, includes CTA";
        case "slug":
          return "slug: lowercase, hyphens, 3-50 chars";
        case "faqs":
          return "faqs: array of 8-10 {question, answer} objects, 40-80 word answers";
        case "highlights":
          return "highlights: array of 5-8 strings, 5-15 words each";
        case "amenities":
          return "amenities: array of 8-15 realistic amenities";
        case "priceRange":
          return "priceRange: $ to $$$$ or descriptive term";
        case "socialFacebook":
          return "socialFacebook: 80-150 chars with emoji and CTA";
        case "socialTwitter":
          return "socialTwitter: max 280 chars with 2-4 hashtags";
        case "coordinates":
          return "coordinates: {lat, lng} with 6 decimal precision";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n- ");

  return {
    system: SYSTEM_BASE,
    user: `Generate all requested fields for this ${context.entityType}:

Entity: ${context.entityName}
${context.destination ? `Location: ${context.destination}` : ""}
${context.category ? `Category: ${context.category}` : ""}
${context.existingTitle ? `Existing title: ${context.existingTitle}` : ""}
${context.existingDescription ? `Existing description: ${context.existingDescription.substring(0, 300)}` : ""}
${context.keywords?.length ? `Keywords: ${context.keywords.join(", ")}` : ""}
${context.targetAudience?.length ? `Target audience: ${context.targetAudience.join(", ")}` : ""}
Tone: ${getToneGuide(context.tone)}

Fields to generate:
- ${fieldDescriptions}

CRITICAL: Follow the exact length/format requirements for each field.

Return JSON object with all requested fields.`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getToneGuide(tone?: string): string {
  switch (tone) {
    case "professional":
      return "Professional and authoritative - establish trust and expertise";
    case "friendly":
      return "Warm and conversational - like a helpful friend giving advice";
    case "luxury":
      return "Sophisticated and elegant - appeal to discerning travelers";
    case "adventurous":
      return "Exciting and energetic - inspire action and exploration";
    case "informative":
      return "Clear and factual - focus on practical details";
    default:
      return "Friendly yet professional - knowledgeable local friend";
  }
}

/**
 * Get the appropriate prompt function for a field type
 */
export function getPromptForField(
  fieldType: FieldType,
  context: PromptContext
): { system: string; user: string } {
  switch (fieldType) {
    case "title":
      return getTitlePrompt(context);
    case "description":
      return getDescriptionPrompt(context);
    case "metaTitle":
      return getMetaTitlePrompt(context);
    case "metaDescription":
      return getMetaDescriptionPrompt(context);
    case "slug":
      return getSlugPrompt(context);
    case "faqs":
      return getFAQsPrompt(context);
    case "coordinates":
      return getCoordinatesPrompt(context);
    case "socialFacebook":
      return getSocialFacebookPrompt(context);
    case "socialTwitter":
      return getSocialTwitterPrompt(context);
    case "highlights":
      return getHighlightsPrompt(context);
    case "amenities":
      return getAmenitiesPrompt(context);
    case "priceRange":
      return getPriceRangePrompt(context);
    default:
      throw new Error(`Unknown field type: ${fieldType}`);
  }
}
