/**
 * Attraction Content Generator V2
 * Uses Multi-Model AI Provider with automatic fallback
 * Outputs structured aiContent for frontend Blueprint sections
 */

import { getMultiModelProvider, type GenerationResult } from "../ai/multi-model-provider";
import type { TiqetsAttraction } from "@shared/schema";
import { SEO_REQUIREMENTS, BANNED_PHRASES } from "../lib/seo-standards";
import { createLogger } from "../lib/logger";

const logger = createLogger("attraction-content-generator");

// ============================================================================
// Types
// ============================================================================

export interface AIContent {
  introduction: string;
  whyVisit: string;
  proTip: string;
  whatToExpect: Array<{ title: string; description: string; icon: string }>;
  visitorTips: Array<{ title: string; description: string; icon: string }>;
  howToGetThere: {
    description: string;
    transport: Array<{ mode: string; details: string }>;
  };
  answerCapsule: string;
  schemaPayload: Record<string, unknown>;
}

export interface GeneratedAttractionContent {
  h1Title: string;
  metaTitle: string;
  metaDescription: string;
  highlights: string[];
  faqs: Array<{ question: string; answer: string }>;
  aiContent: AIContent;
}

export interface ContentGenerationResult {
  content: GeneratedAttractionContent;
  warnings: string[];
  provider: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

// ============================================================================
// Validation
// ============================================================================

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
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

function validateContent(content: GeneratedAttractionContent): string[] {
  const warnings: string[] = [];

  // Meta title length
  if (content.metaTitle.length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    warnings.push(
      `Meta title ${content.metaTitle.length} chars (max ${SEO_REQUIREMENTS.metaTitle.maxLength})`
    );
    content.metaTitle = truncateToLimit(content.metaTitle, SEO_REQUIREMENTS.metaTitle.maxLength);
  }

  // Meta description length
  if (content.metaDescription.length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    warnings.push(
      `Meta description ${content.metaDescription.length} chars (max ${SEO_REQUIREMENTS.metaDescription.maxLength})`
    );
    content.metaDescription = truncateToLimit(
      content.metaDescription,
      SEO_REQUIREMENTS.metaDescription.maxLength
    );
  }

  // Banned phrases in meta
  const bannedInMeta = containsBannedPhrases(content.metaTitle + " " + content.metaDescription);
  if (bannedInMeta.length > 0) {
    warnings.push(`Banned phrases in meta: ${bannedInMeta.join(", ")}`);
  }

  // Banned phrases in content
  const allContent = [
    content.aiContent.introduction,
    content.aiContent.whyVisit,
    content.aiContent.proTip,
    content.aiContent.answerCapsule,
  ].join(" ");
  const bannedInContent = containsBannedPhrases(allContent);
  if (bannedInContent.length > 0) {
    warnings.push(`Banned phrases in content: ${bannedInContent.join(", ")}`);
  }

  // Ensure arrays have content
  if (content.aiContent.whatToExpect.length < 3) {
    warnings.push(
      `Only ${content.aiContent.whatToExpect.length} "What to Expect" items (recommended 4+)`
    );
  }
  if (content.aiContent.visitorTips.length < 3) {
    warnings.push(
      `Only ${content.aiContent.visitorTips.length} "Visitor Tips" items (recommended 4+)`
    );
  }
  if (content.faqs.length < 4) {
    warnings.push(`Only ${content.faqs.length} FAQs (recommended 5+)`);
  }

  return warnings;
}

// ============================================================================
// Prompt Builder
// ============================================================================

// Helper function to convert numeric rating to label
function getRatingLabel(rating: number | null | undefined): string | null {
  if (!rating || rating < 3.8) return null;
  if (rating >= 4.5) return "Highly Rated";
  return "Well Rated";
}

function buildPrompt(attraction: TiqetsAttraction): string {
  const city = attraction.cityName || "the city";
  const name = attraction.title;

  // Get rating label (or null if below 3.8)
  const ratingLabel = getRatingLabel(attraction.tiqetsRating as unknown as number | null);
  const ratingLine = ratingLabel ? `- Visitor Rating: ${ratingLabel}` : "";

  return `You are a professional travel content writer creating SEO/AEO optimized content for TRAVI World.

ATTRACTION DETAILS:
- Name: ${name}
- City: ${city}
- Venue: ${attraction.venueName || "N/A"}
- Duration: ${attraction.duration || "Varies"}
- Languages: ${attraction.languages?.join(", ") || "English"}
- Accessibility: ${attraction.wheelchairAccess ? "Wheelchair accessible" : "Standard access"}${ratingLine ? "\n" + ratingLine : ""}

REFERENCE DATA (use for inspiration, rewrite completely):
Original highlights: ${attraction.tiqetsHighlights?.join("; ") || "No highlights available"}
Original description: ${(attraction.tiqetsDescription || "").slice(0, 500)}

WRITING RULES:
1. Write EVERYTHING in your own words - never copy reference data
2. Friendly, inviting tone: 60% warm and engaging, 40% factual
3. FORBIDDEN words (never use): must-visit, world-class, hidden gem, breathtaking, bucket list, paradise, mind-blowing, ultimate guide, unforgettable, stunning
4. All content in English
5. Include specific, practical information visitors can use
6. Write naturally like a human travel writer - avoid patterns that reveal AI authorship:
   - NO double dashes (--) 
   - NO excessive bullet formatting
   - NO repetitive sentence structures
   - NO overuse of "you will" or "visitors will"
   - Vary sentence length and structure
   - Use natural transitions between ideas

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "h1_title": "SEO H1 title with city name (50-60 chars)",
  "meta_title": "Meta title: Name + Descriptor + City (50-60 chars)",
  "meta_description": "Compelling meta description with CTA (150-160 chars)",
  "highlights": [
    "Key feature 1 in one sentence",
    "Key feature 2 in one sentence",
    "Key feature 3 in one sentence"
  ],
  "ai_content": {
    "introduction": "2-3 paragraphs (150-200 words) introducing the attraction. Set the scene, describe what makes it special, and what visitors will experience.",
    "why_visit": "3-4 paragraphs (200-250 words) explaining why this attraction is worth visiting. Include unique aspects, experiences, and what sets it apart.",
    "pro_tip": "Insider tip that helps visitors make the most of their visit (50-80 words). Be specific and practical.",
    "what_to_expect": [
      { "title": "Duration", "description": "Specific info about time needed", "icon": "Clock" },
      { "title": "Best Time to Visit", "description": "Optimal visiting hours/seasons", "icon": "Sun" },
      { "title": "Crowd Levels", "description": "When it's busy vs quiet", "icon": "Users" },
      { "title": "Photography", "description": "Photo tips and restrictions", "icon": "Camera" }
    ],
    "visitor_tips": [
      { "title": "What to Wear", "description": "Dress code and comfort tips", "icon": "Shirt" },
      { "title": "What to Bring", "description": "Essential items", "icon": "Backpack" },
      { "title": "Accessibility", "description": "Access info for all visitors", "icon": "Accessibility" },
      { "title": "Food & Drinks", "description": "Dining options nearby or on-site", "icon": "UtensilsCrossed" }
    ],
    "how_to_get_there": {
      "description": "Overview of location and access (2-3 sentences)",
      "transport": [
        { "mode": "Metro", "details": "Nearest station and walking time" },
        { "mode": "Taxi/Uber", "details": "Approximate cost and drop-off point" },
        { "mode": "Parking", "details": "Available parking and fees" }
      ]
    },
    "answer_capsule": "Direct 2-3 sentence answer for 'What is ${name}?' - perfect for featured snippets and voice search. Include location and main experience."
  },
  "faqs": [
    { "question": "What are the opening hours of ${name}?", "answer": "Specific hours with any seasonal variations (40-60 words)" },
    { "question": "How long should I plan to spend at ${name}?", "answer": "Recommended duration with explanation (40-60 words)" },
    { "question": "Is ${name} suitable for children?", "answer": "Family-friendly assessment with age recommendations (40-60 words)" },
    { "question": "Do I need to book tickets in advance for ${name}?", "answer": "Booking advice with reasoning (40-60 words)" },
    { "question": "What's the best time to visit ${name}?", "answer": "Optimal timing advice (40-60 words)" }
  ],
  "schema_payload": {
    "@type": "TouristAttraction",
    "name": "${name}",
    "description": "[Same as meta_description]",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${city}"
    }
  }
}

CRITICAL: Return ONLY the JSON object. No markdown fences, no explanations before or after.`;
}

// ============================================================================
// JSON Auto-Repair Utilities
// ============================================================================

/**
 * Attempt to repair truncated or malformed JSON responses from AI providers.
 * This is critical for production reliability - AI providers often return
 * incomplete responses due to token limits or network issues.
 */
function repairJSON(jsonString: string): string {
  let fixed = jsonString.trim();

  // Remove markdown code fences if present
  if (fixed.startsWith("```json")) {
    fixed = fixed.slice(7);
  } else if (fixed.startsWith("```")) {
    fixed = fixed.slice(3);
  }
  if (fixed.endsWith("```")) {
    fixed = fixed.slice(0, -3);
  }
  fixed = fixed.trim();

  // Count opening and closing braces/brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      else if (char === "[") bracketCount++;
      else if (char === "]") bracketCount--;
    }
  }

  // Fix truncated strings - if we're inside a string, close it
  if (inString) {
    fixed += '"';
  }

  // If JSON ends abruptly mid-object/array, try to salvage
  // Remove trailing incomplete key-value pairs
  const lastCompleteIndex = findLastCompleteElement(fixed);
  if (lastCompleteIndex > 0 && lastCompleteIndex < fixed.length - 1) {
    fixed = fixed.slice(0, lastCompleteIndex + 1);
    // Recount after truncation
    braceCount = 0;
    bracketCount = 0;
    inString = false;
    escapeNext = false;

    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") braceCount++;
        else if (char === "}") braceCount--;
        else if (char === "[") bracketCount++;
        else if (char === "]") bracketCount--;
      }
    }
  }

  // Close any open brackets first, then braces
  while (bracketCount > 0) {
    fixed += "]";
    bracketCount--;
  }
  while (braceCount > 0) {
    fixed += "}";
    braceCount--;
  }

  return fixed;
}

/**
 * Find the index of the last complete JSON element (ends with }, ], ", number, true, false, null)
 */
function findLastCompleteElement(json: string): number {
  // Look backwards for a complete value
  for (let i = json.length - 1; i >= 0; i--) {
    const char = json[i];
    // These characters indicate the end of a complete value
    if (char === "}" || char === "]" || char === '"') {
      return i;
    }
    // Numbers, booleans, null
    if (/[0-9]/.test(char)) {
      // Walk back to find the full number
      let j = i;
      while (j > 0 && /[0-9.eE+-]/.test(json[j - 1])) j--;
      return i;
    }
    if (json.slice(Math.max(0, i - 3), i + 1) === "true") return i;
    if (json.slice(Math.max(0, i - 4), i + 1) === "false") return i;
    if (json.slice(Math.max(0, i - 3), i + 1) === "null") return i;
    // Skip whitespace
    if (/\s/.test(char)) continue;
    // If we hit a comma or colon, we're mid-element - keep looking
    if (char === "," || char === ":") continue;
    // Anything else, stop
    break;
  }
  return -1;
}

// ============================================================================
// Response Parser
// ============================================================================

function parseAIResponse(rawContent: string): GeneratedAttractionContent {
  // First attempt: try parsing as-is after basic cleanup
  let jsonString = rawContent.trim();

  // Remove markdown code fences if present
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  let parsed: any;

  try {
    parsed = JSON.parse(jsonString);
  } catch (firstError) {
    // Second attempt: try auto-repair
    try {
      const repaired = repairJSON(rawContent);
      parsed = JSON.parse(repaired);
      // Log that we auto-repaired
    } catch {
      // If repair also fails, throw original error for better debugging
      throw firstError;
    }
  }

  // Map snake_case to camelCase and build the structured content
  const aiContent: AIContent = {
    introduction: parsed.ai_content?.introduction || "",
    whyVisit: parsed.ai_content?.why_visit || "",
    proTip: parsed.ai_content?.pro_tip || "",
    whatToExpect: Array.isArray(parsed.ai_content?.what_to_expect)
      ? parsed.ai_content.what_to_expect.map(
          (item: { title?: string; description?: string; icon?: string }) => ({
            title: item.title || "",
            description: item.description || "",
            icon: item.icon || "Info",
          })
        )
      : [],
    visitorTips: Array.isArray(parsed.ai_content?.visitor_tips)
      ? parsed.ai_content.visitor_tips.map(
          (item: { title?: string; description?: string; icon?: string }) => ({
            title: item.title || "",
            description: item.description || "",
            icon: item.icon || "Info",
          })
        )
      : [],
    howToGetThere: {
      description: parsed.ai_content?.how_to_get_there?.description || "",
      transport: Array.isArray(parsed.ai_content?.how_to_get_there?.transport)
        ? parsed.ai_content.how_to_get_there.transport.map(
            (t: { mode?: string; details?: string }) => ({
              mode: t.mode || "",
              details: t.details || "",
            })
          )
        : [],
    },
    answerCapsule: parsed.ai_content?.answer_capsule || "",
    schemaPayload: parsed.schema_payload || {},
  };

  return {
    h1Title: parsed.h1_title || "",
    metaTitle: parsed.meta_title || "",
    metaDescription: parsed.meta_description || "",
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    faqs: Array.isArray(parsed.faqs)
      ? parsed.faqs.map((faq: { question?: string; answer?: string }) => ({
          question: faq.question || "",
          answer: faq.answer || "",
        }))
      : [],
    aiContent,
  };
}

// ============================================================================
// Main Generator Function
// ============================================================================

export interface GenerationOptions {
  specificProvider?: "anthropic" | "openai" | "gemini";
}

export async function generateAttractionContent(
  attraction: TiqetsAttraction,
  options: GenerationOptions = {}
): Promise<ContentGenerationResult> {
  logger.info(
    {
      attractionId: attraction.id,
      title: attraction.title,
      provider: options.specificProvider || "auto",
    },
    "Starting content generation"
  );

  const prompt = buildPrompt(attraction);
  const provider = getMultiModelProvider();

  const systemPrompt = `You are an expert travel content writer for TRAVI World, creating engaging, SEO-optimized content. 
You always output valid JSON only, with no markdown formatting or explanations.
Your content is practical, specific, and helps travelers make informed decisions.`;

  let result: GenerationResult;
  try {
    if (options.specificProvider) {
      result = await provider.generateWithSpecificProvider(options.specificProvider, prompt, {
        maxTokens: 8192,
        temperature: 0.7,
        systemPrompt,
      });
    } else {
      result = await provider.generate(prompt, {
        maxTokens: 8192,
        temperature: 0.7,
        systemPrompt,
      });
    }
  } catch (error) {
    logger.error({ error: String(error), attractionId: attraction.id }, "AI provider failed");
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  let content: GeneratedAttractionContent;
  try {
    content = parseAIResponse(result.content);
  } catch (error) {
    logger.error(
      {
        error: String(error),
        attractionId: attraction.id,
        rawResponse: result.content.slice(0, 500),
      },
      "Failed to parse AI response"
    );
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const warnings = validateContent(content);

  logger.info(
    {
      attractionId: attraction.id,
      title: attraction.title,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      tokensUsed: result.tokensUsed,
      warnings: warnings.length,
    },
    "Content generation completed"
  );

  return {
    content,
    warnings,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    tokensUsed: result.tokensUsed,
  };
}

// ============================================================================
// Batch Generator with Parallel Processing
// ============================================================================

export interface BatchGenerationResult {
  successful: Array<{
    attractionId: string;
    content: GeneratedAttractionContent;
    provider: string;
    latencyMs: number;
  }>;
  failed: Array<{
    attractionId: string;
    error: string;
  }>;
  totalTime: number;
}

export async function generateBatchContent(
  attractions: TiqetsAttraction[],
  options: { concurrency?: number } = {}
): Promise<BatchGenerationResult> {
  const { concurrency = 3 } = options;
  const startTime = Date.now();

  const successful: BatchGenerationResult["successful"] = [];
  const failed: BatchGenerationResult["failed"] = [];

  // Process in batches to control concurrency
  for (let i = 0; i < attractions.length; i += concurrency) {
    const batch = attractions.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async attraction => {
        const result = await generateAttractionContent(attraction);
        return { attractionId: attraction.id, ...result };
      })
    );

    for (const [index, result] of results.entries()) {
      const attraction = batch[index];
      if (result.status === "fulfilled") {
        successful.push({
          attractionId: result.value.attractionId,
          content: result.value.content,
          provider: result.value.provider,
          latencyMs: result.value.latencyMs,
        });
      } else {
        failed.push({
          attractionId: attraction.id,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
  }

  const totalTime = Date.now() - startTime;

  logger.info(
    {
      total: attractions.length,
      successful: successful.length,
      failed: failed.length,
      totalTime,
    },
    "Batch content generation completed"
  );

  return { successful, failed, totalTime };
}
