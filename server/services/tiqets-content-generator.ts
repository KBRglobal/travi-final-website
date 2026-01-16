/**
 * Tiqets Attraction Content Generator
 * Uses Claude API via Replit AI Integrations to generate SEO/AEO optimized content
 */

import Anthropic from "@anthropic-ai/sdk";
import type { TiqetsAttraction } from "@shared/schema";
import { SEO_REQUIREMENTS, BANNED_PHRASES } from "../lib/seo-standards";

// Alias for backward compatibility
const SEO_STANDARDS = {
  metaTitleMax: SEO_REQUIREMENTS.metaTitle.maxLength,
  metaDescriptionMax: SEO_REQUIREMENTS.metaDescription.maxLength,
  articleBodyMin: 100, // Minimum words for attraction description
};

export interface GeneratedContent {
  h1Title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  highlights: string[];
  whatsIncluded: string[];
  whatsExcluded: string[];
  faqs: Array<{ question: string; answer: string }>;
}

function containsBannedPhrases(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }
  return found;
}

function truncateToLimit(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

function validateAndSanitizeContent(content: GeneratedContent): { content: GeneratedContent; warnings: string[] } {
  const warnings: string[] = [];
  
  if (content.metaTitle.length > SEO_STANDARDS.metaTitleMax) {
    warnings.push(`Meta title truncated from ${content.metaTitle.length} to ${SEO_STANDARDS.metaTitleMax} chars`);
    content.metaTitle = truncateToLimit(content.metaTitle, SEO_STANDARDS.metaTitleMax);
  }
  
  if (content.metaDescription.length > SEO_STANDARDS.metaDescriptionMax) {
    warnings.push(`Meta description truncated from ${content.metaDescription.length} to ${SEO_STANDARDS.metaDescriptionMax} chars`);
    content.metaDescription = truncateToLimit(content.metaDescription, SEO_STANDARDS.metaDescriptionMax);
  }
  
  const descWords = content.description.split(/\s+/).length;
  if (descWords < SEO_STANDARDS.articleBodyMin) {
    warnings.push(`Description has ${descWords} words (minimum ${SEO_STANDARDS.articleBodyMin})`);
  }
  
  const bannedInMeta = containsBannedPhrases(content.metaTitle + ' ' + content.metaDescription);
  if (bannedInMeta.length > 0) {
    warnings.push(`Banned phrases found in meta: ${bannedInMeta.join(', ')}`);
  }
  
  const bannedInDesc = containsBannedPhrases(content.description);
  if (bannedInDesc.length > 0) {
    warnings.push(`Banned phrases found in description: ${bannedInDesc.join(', ')}`);
  }
  
  return { content, warnings };
}

function buildPrompt(attraction: TiqetsAttraction): string {
  return `You are a professional travel content writer creating SEO/AEO optimized content for TRAVI World.

ATTRACTION INFO:
Name: ${attraction.title}
City: ${attraction.cityName}
Venue: ${attraction.venueName || "N/A"}
Duration: ${attraction.duration || "Varies"}
Languages: ${attraction.languages?.join(", ") || "English"}
Accessibility: ${attraction.wheelchairAccess ? "Wheelchair accessible" : "Standard access"}

REFERENCE DATA (rewrite completely, don't copy):
Tiqets Highlights: ${attraction.tiqetsHighlights?.join("; ") || "No highlights available"}
Tiqets Description: ${attraction.tiqetsDescription || "No description available"}
What's Included: ${attraction.tiqetsWhatsIncluded || "Not specified"}
What's Excluded: ${attraction.tiqetsWhatsExcluded || "Not specified"}

RULES:
1. Write EVERYTHING in your own words - never copy from reference data
2. Friendly, inviting tone (60% friendly + 40% factual)
3. No forbidden words: must-visit, world-class, hidden gem, breathtaking, bucket list, paradise, mind-blowing, ultimate guide
4. All content in English
5. Return ONLY valid JSON

OUTPUT FORMAT:
{
  "h1_title": "SEO H1 title (50-60 chars, include city)",
  "meta_title": "Meta title (50-60 chars: Name + Descriptor + City)",
  "meta_description": "Meta description (150-160 chars with CTA)",
  "description": "Full description (600-1200 words) with markdown H2 sections: ## Why Visit, ## What to Expect, ## Visitor Tips, ## How to Get There",
  "highlights": [
    "Rewritten highlight 1 (one full sentence)",
    "Rewritten highlight 2",
    "Rewritten highlight 3"
  ],
  "whats_included": [
    "Rewritten item 1",
    "Rewritten item 2"
  ],
  "whats_excluded": [
    "Rewritten item 1",
    "Rewritten item 2"
  ],
  "faqs": [
    {
      "question": "What are the opening hours?",
      "answer": "Direct answer in 40-60 words"
    },
    {
      "question": "How long should I plan to visit?",
      "answer": "Direct answer in 40-60 words"
    },
    {
      "question": "Is it suitable for families with children?",
      "answer": "Direct answer in 40-60 words"
    },
    {
      "question": "What's the best time to visit?",
      "answer": "Direct answer in 40-60 words"
    }
  ]
}

CRITICAL: Return ONLY the JSON object, no markdown fences, no explanations.`;
}

function parseAIResponse(content: string): GeneratedContent {
  let jsonString = content.trim();
  
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  const parsed = JSON.parse(jsonString);
  
  return {
    h1Title: parsed.h1_title || "",
    metaTitle: parsed.meta_title || "",
    metaDescription: parsed.meta_description || "",
    description: parsed.description || "",
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    whatsIncluded: Array.isArray(parsed.whats_included) ? parsed.whats_included : [],
    whatsExcluded: Array.isArray(parsed.whats_excluded) ? parsed.whats_excluded : [],
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
  };
}

export async function generateAttractionContent(
  attraction: TiqetsAttraction
): Promise<{ content: GeneratedContent; warnings: string[] }> {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error("Anthropic API not configured - Replit AI Integrations required");
  }

  const client = new Anthropic({
    apiKey,
    baseURL,
  });

  const prompt = buildPrompt(attraction);

  console.log(`[Content Generator] Starting generation for: ${attraction.title}`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content[0];
  if (textContent.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const rawContent = parseAIResponse(textContent.text);
  const { content, warnings } = validateAndSanitizeContent(rawContent);
  
  if (warnings.length > 0) {
    console.log(`[Content Generator] Warnings for ${attraction.title}:`, warnings);
  }

  console.log(`[Content Generator] Completed generation for: ${attraction.title}`);

  return { content, warnings };
}

export async function generateAndSaveContent(
  attraction: TiqetsAttraction,
  storage: {
    updateTiqetsAttraction: (
      id: string,
      data: Partial<TiqetsAttraction>
    ) => Promise<TiqetsAttraction | undefined>;
  }
): Promise<{ attraction: TiqetsAttraction | undefined; warnings: string[] }> {
  const { content, warnings } = await generateAttractionContent(attraction);

  const updated = await storage.updateTiqetsAttraction(attraction.id, {
    h1Title: content.h1Title,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    description: content.description,
    highlights: content.highlights,
    whatsIncluded: content.whatsIncluded,
    whatsExcluded: content.whatsExcluded,
    faqs: content.faqs,
    status: "ready",
    contentGeneratedAt: new Date(),
  });

  return { attraction: updated, warnings };
}
