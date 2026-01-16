/**
 * AI Image Alt-Text Generator
 * 
 * Generates SEO-compliant alt text for images following strict requirements:
 * - Length: 5-15 words, 20-125 characters
 * - Format: [Subject] + [location/context] + [visual detail]
 * - Style: Factual descriptions only, NO marketing language
 */

import { createLogger } from "../lib/logger";
import { getAllUnifiedProviders, markProviderFailed, type AIMessage } from "./providers";
import { SEO_REQUIREMENTS, validateAltText } from "../lib/seo-standards";

const logger = createLogger("alt-text-generator");

// ============================================================================
// BANNED WORDS IN ALT TEXT
// ============================================================================

const BANNED_ALT_WORDS = [
  "stunning",
  "amazing",
  "beautiful",
  "breathtaking",
  "gorgeous",
  "spectacular",
  "magnificent",
  "incredible",
  "wonderful",
  "awesome",
  "fantastic",
  "perfect",
  "best",
  "ultimate",
  "luxury",
  "exclusive",
  "world-class",
  "must-see",
  "hidden gem",
];

// ============================================================================
// TYPES
// ============================================================================

export interface AltTextRequest {
  imageUrl?: string;
  imageContext: string; // What the image is about
  location?: string; // Where the image is from
  contentType?: "attraction" | "hotel" | "restaurant" | "destination" | "general";
}

export interface AltTextResult {
  altText: string;
  wordCount: number;
  charCount: number;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// ALT TEXT GENERATION
// ============================================================================

/**
 * Generate SEO-compliant alt text for an image
 */
export async function generateAltText(request: AltTextRequest): Promise<AltTextResult> {
  const providers = getAllUnifiedProviders();
  
  if (providers.length === 0) {
    // Fallback to simple generation without AI
    return generateFallbackAltText(request);
  }
  
  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are an image alt text generator for a travel website. Generate SEO-optimized alt text following these STRICT rules:

LENGTH REQUIREMENTS (MANDATORY):
- Minimum: 5 words, 20 characters
- Maximum: 15 words, 125 characters

FORMAT:
[Subject] + [location/context] + [visual detail]

STYLE:
- Factual descriptions ONLY
- NO marketing language
- NO superlatives (stunning, amazing, beautiful, etc.)
- NO subjective opinions
- Describe what is visually present

BANNED WORDS (NEVER USE):
${BANNED_ALT_WORDS.join(", ")}

EXAMPLES:
GOOD: "Luxury shopping atrium inside Dubai Mall with marble floors and high ceilings"
GOOD: "Traditional Thai longtail boat on turquoise waters near limestone cliffs in Krabi"
GOOD: "Eiffel Tower viewed from Trocadero gardens at sunset with tourists walking"

BAD: "Stunning view of the beautiful Eiffel Tower" (marketing language)
BAD: "Tower" (too short)
BAD: "The most amazing and breathtaking view of the gorgeous Eiffel Tower in the stunning city of Paris France" (too long, marketing words)

Respond with ONLY the alt text, nothing else.`,
    },
    {
      role: "user",
      content: buildAltTextPrompt(request),
    },
  ];
  
  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages,
        temperature: 0.5,
        maxTokens: 100,
      });
      
      const altText = cleanAltText(result.content);
      const validation = validateAltText(altText);
      
      // If valid, return it
      if (validation.valid) {
        return {
          altText,
          wordCount: altText.split(/\s+/).filter(Boolean).length,
          charCount: altText.length,
          isValid: true,
          errors: [],
        };
      }
      
      // Try to fix common issues
      const fixedAltText = fixAltTextIssues(altText, request);
      const fixedValidation = validateAltText(fixedAltText);
      
      return {
        altText: fixedAltText,
        wordCount: fixedAltText.split(/\s+/).filter(Boolean).length,
        charCount: fixedAltText.length,
        isValid: fixedValidation.valid,
        errors: fixedValidation.errors,
      };
    } catch (error) {
      logger.warn({ error: String(error) }, `Provider ${provider.name} failed for alt text generation`);
      markProviderFailed(provider.name);
      continue;
    }
  }
  
  // Fallback if all providers fail
  return generateFallbackAltText(request);
}

/**
 * Generate alt text for multiple images
 */
export async function generateBatchAltText(
  requests: AltTextRequest[]
): Promise<AltTextResult[]> {
  const results: AltTextResult[] = [];
  
  // Process in parallel with concurrency limit
  const concurrency = 3;
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(generateAltText));
    results.push(...batchResults);
  }
  
  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildAltTextPrompt(request: AltTextRequest): string {
  let prompt = `Generate alt text for an image of: ${request.imageContext}`;
  
  if (request.location) {
    prompt += `\nLocation: ${request.location}`;
  }
  
  if (request.contentType) {
    prompt += `\nContent type: ${request.contentType}`;
  }
  
  return prompt;
}

function cleanAltText(text: string): string {
  let cleaned = text.trim();
  
  // Remove quotes if wrapped
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Remove "Alt text:" prefix if present
  cleaned = cleaned.replace(/^(alt text:|alt:)\s*/i, "");
  
  // Remove any markdown
  cleaned = cleaned.replace(/[*_`]/g, "");
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

function fixAltTextIssues(altText: string, request: AltTextRequest): string {
  let fixed = altText;
  
  // Remove banned words
  for (const word of BANNED_ALT_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    fixed = fixed.replace(regex, "");
  }
  
  // Clean up double spaces
  fixed = fixed.replace(/\s+/g, " ").trim();
  
  // If too short, add context
  const words = fixed.split(/\s+/).filter(Boolean);
  if (words.length < SEO_REQUIREMENTS.altText.minWords) {
    if (request.location) {
      fixed = `${fixed} in ${request.location}`;
    }
    if (request.contentType) {
      const typeDescriptors: Record<string, string> = {
        attraction: "tourist attraction",
        hotel: "accommodation",
        restaurant: "dining venue",
        destination: "travel destination",
        general: "scene",
      };
      fixed = `${fixed} ${typeDescriptors[request.contentType] || "scene"}`;
    }
  }
  
  // If too long, truncate
  const fixedWords = fixed.split(/\s+/).filter(Boolean);
  if (fixedWords.length > SEO_REQUIREMENTS.altText.maxWords) {
    fixed = fixedWords.slice(0, SEO_REQUIREMENTS.altText.maxWords).join(" ");
  }
  
  // Ensure minimum character count
  if (fixed.length < SEO_REQUIREMENTS.altText.minChars) {
    fixed = `${request.imageContext} ${request.location ? `in ${request.location}` : "travel scene"}`;
  }
  
  // Ensure maximum character count
  if (fixed.length > SEO_REQUIREMENTS.altText.maxChars) {
    fixed = fixed.substring(0, SEO_REQUIREMENTS.altText.maxChars - 3).trim() + "...";
  }
  
  return fixed;
}

function generateFallbackAltText(request: AltTextRequest): AltTextResult {
  // Generate simple descriptive alt text without AI
  let altText = request.imageContext;
  
  if (request.location) {
    altText = `${altText} in ${request.location}`;
  }
  
  // Add content type context if needed
  if (altText.split(/\s+/).length < SEO_REQUIREMENTS.altText.minWords) {
    const contextMap: Record<string, string> = {
      attraction: "visitor attraction view",
      hotel: "hotel exterior and entrance",
      restaurant: "restaurant interior view",
      destination: "travel destination scenery",
      general: "travel photography scene",
    };
    altText = `${altText} ${contextMap[request.contentType || "general"]}`;
  }
  
  // Truncate if too long
  if (altText.length > SEO_REQUIREMENTS.altText.maxChars) {
    altText = altText.substring(0, SEO_REQUIREMENTS.altText.maxChars - 3).trim() + "...";
  }
  
  const validation = validateAltText(altText);
  
  return {
    altText,
    wordCount: altText.split(/\s+/).filter(Boolean).length,
    charCount: altText.length,
    isValid: validation.valid,
    errors: validation.errors,
  };
}

/**
 * Validate existing alt text and suggest improvements
 */
export function validateAndSuggestAltText(altText: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const validation = validateAltText(altText);
  const suggestions: string[] = [];
  
  // Check for banned words
  const lowerAlt = altText.toLowerCase();
  const foundBanned = BANNED_ALT_WORDS.filter(word => lowerAlt.includes(word));
  
  if (foundBanned.length > 0) {
    validation.errors.push(`Contains marketing words: ${foundBanned.join(", ")}`);
    suggestions.push(`Remove marketing words and use factual descriptions`);
  }
  
  // Suggest improvements
  const words = altText.split(/\s+/).filter(Boolean);
  
  if (words.length < SEO_REQUIREMENTS.altText.minWords) {
    suggestions.push("Add more descriptive details about what's in the image");
    suggestions.push("Include location context if applicable");
  }
  
  if (words.length > SEO_REQUIREMENTS.altText.maxWords) {
    suggestions.push("Shorten to focus on the most important visual elements");
  }
  
  if (!altText.match(/\b(in|at|near|from|of)\b/i)) {
    suggestions.push("Consider adding location context (in, at, near)");
  }
  
  return {
    isValid: validation.valid && foundBanned.length === 0,
    issues: validation.errors,
    suggestions,
  };
}
