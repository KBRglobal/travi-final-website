/**
 * Attraction Content Generator V2
 * Generates SEO/AEO optimized content with all required sections
 * Target: 1,200-1,800 words with human-like writing
 * 
 * Multi-provider support: Anthropic, OpenAI, Gemini, Groq, Mistral, DeepSeek
 * with round-robin distribution and health tracking
 */

import type { TiqetsAttraction } from "@shared/schema";
import { validateContent, AI_PATTERNS, QualityScore } from "./content-quality-validator";
import { EngineRegistry, generateWithEngine, EngineConfig } from "./engine-registry";

export function getKeyPoolSize(): number {
  return EngineRegistry.getEngineCount();
}

export function getEngineStats() {
  return EngineRegistry.getStats();
}

export interface GeneratedContentV2 {
  introduction: string;
  whatToExpect: string;
  bestTimeToVisit: string;
  historicalContext: string;
  visitorTips: string;
  howToGetThere: string;
  faqs: Array<{ question: string; answer: string }>;
  answerCapsule: string;
  metaTitle: string;
  metaDescription: string;
  schemaPayload: Record<string, any>;
}

function buildUserPrompt(attraction: TiqetsAttraction): string {
  const attractionName = attraction.title?.split(":")[0] || "this attraction";
  const currentYear = new Date().getFullYear();
  
  return `ATTRACTION DATA:
Name: ${attraction.title}
City: ${attraction.cityName}
Venue: ${attraction.venueName || "Main location"}
Duration: ${attraction.duration || "2-3 hours"}
Categories: ${attraction.primaryCategory || "Attraction"}, ${attraction.secondaryCategories?.join(", ") || ""}
Languages: ${attraction.languages?.join(", ") || "English"}
Wheelchair Access: ${attraction.wheelchairAccess ? "Yes" : "Standard access"}

SOURCE INFORMATION (use as reference, rewrite completely):
Description: ${attraction.tiqetsDescription || "No description available"}
Highlights: ${attraction.tiqetsHighlights?.join("; ") || "No highlights"}

REQUIRED OUTPUT - JSON with these exact sections:
{
  "introduction": "150-200 words. Hook the reader immediately. What makes this place special? Include city name.",
  
  "whatToExpect": "250-350 words. Walk through the experience chronologically. What will they see, do, feel?",
  
  "bestTimeToVisit": "200-300 words. Best months/seasons, best time of day, how to avoid crowds, weather.",
  
  "historicalContext": "200-300 words. When built? Key historical moments. Cultural significance. Don't make up facts.",
  
  "visitorTips": "200-300 words. What to wear/bring, photography rules, money-saving tips, accessibility.",
  
  "howToGetThere": "150-250 words. ALL transport: Metro, bus, taxi/rideshare, parking. Be specific with stations.",
  
  "faqs": [
    {"question": "How much time should I spend at ${attractionName}?", "answer": "40-60 words"},
    {"question": "Is ${attractionName} suitable for children?", "answer": "40-60 words"},
    {"question": "What are the opening hours?", "answer": "40-60 words"},
    {"question": "Do I need to book tickets in advance?", "answer": "40-60 words"},
    {"question": "Is there wheelchair/stroller access?", "answer": "40-60 words"},
    {"question": "Are there food options nearby?", "answer": "40-60 words"},
    {"question": "What's the best photo spot?", "answer": "40-60 words"},
    {"question": "Can I visit with a guide?", "answer": "40-60 words"}
  ],
  
  "answerCapsule": "30-50 words. Direct answer to 'What is ${attractionName}?'",
  
  "metaTitle": "50-60 characters. Format: [Name] Guide ${currentYear} | TRAVI",
  
  "metaDescription": "150-160 characters. What it is, one benefit, soft CTA.",
  
  "schemaPayload": {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": "${attraction.title}",
    "description": "Use introduction text",
    "address": {"@type": "PostalAddress", "addressLocality": "${attraction.cityName}"}
  }
}

TOTAL: 1,200-1,800 words. Return ONLY valid JSON, no markdown.`;
}

function repairJSON(jsonStr: string): string {
  let fixed = jsonStr;
  
  // Only fix trailing commas - the safest repair
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");
  
  return fixed;
}

function parseResponse(text: string): GeneratedContentV2 {
  let jsonString = text.trim();
  
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
  
  // Try parsing directly first
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.warn("[Content Generator V2] Initial JSON parse failed:", e instanceof Error ? e.message : e);
    
    // Try to repair and parse again
    const repaired = repairJSON(jsonString);
    try {
      parsed = JSON.parse(repaired);
      console.log("[Content Generator V2] JSON repair successful");
    } catch (e2) {
      console.error("[Content Generator V2] JSON repair also failed:", e2 instanceof Error ? e2.message : e2);
      console.error("[Content Generator V2] Raw response length:", jsonString.length);
      console.error("[Content Generator V2] First 500 chars:", jsonString.substring(0, 500));
      throw new Error(`JSON parsing failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
  
  return {
    introduction: parsed.introduction || "",
    whatToExpect: parsed.whatToExpect || parsed.what_to_expect || "",
    bestTimeToVisit: parsed.bestTimeToVisit || parsed.best_time_to_visit || "",
    historicalContext: parsed.historicalContext || parsed.historical_context || "",
    visitorTips: parsed.visitorTips || parsed.visitor_tips || "",
    howToGetThere: parsed.howToGetThere || parsed.how_to_get_there || "",
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
    answerCapsule: parsed.answerCapsule || parsed.answer_capsule || "",
    metaTitle: parsed.metaTitle || parsed.meta_title || "",
    metaDescription: parsed.metaDescription || parsed.meta_description || "",
    schemaPayload: parsed.schemaPayload || parsed.schema_payload || {},
  };
}

export async function generateAttractionContentV2(
  attraction: TiqetsAttraction
): Promise<{ content: GeneratedContentV2; qualityScore: QualityScore; engineId: string }> {
  const engine = EngineRegistry.getNextEngine();
  
  if (!engine) {
    throw new Error("No engines available");
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(attraction);

  console.log(`[Content Generator V2] Starting: ${attraction.title} [${engine.name}]`);

  try {
    const responseText = await generateWithEngine(engine, systemPrompt, userPrompt);
    
    const content = parseResponse(responseText);
    
    const qualityScore = validateContent(content, {
      cityName: attraction.cityName,
      title: attraction.title,
      duration: attraction.duration,
      wheelchairAccess: attraction.wheelchairAccess,
    });

    EngineRegistry.reportSuccess(engine.id);

    console.log(`[Content Generator V2] ✓ ${attraction.title} [${engine.name}]`);
    console.log(`  SEO=${qualityScore.seoScore}, AEO=${qualityScore.aeoScore}, Fact=${qualityScore.factCheckScore}`);

    return { content, qualityScore, engineId: engine.id };
  } catch (error) {
    EngineRegistry.reportError(engine.id, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

function buildSystemPrompt(): string {
  return `You are a seasoned travel writer with 15 years of experience writing for Lonely Planet and National Geographic Traveler. Write content for TRAVI, a trusted travel guide.

CRITICAL RULES:
1. Write like a knowledgeable local friend, not a robot
2. Use specific details and concrete examples
3. Vary sentence length (mix short punchy sentences with longer ones)
4. Start sentences differently (avoid "The", "This", "It" repeatedly)
5. Use active voice predominantly
6. Include sensory details when relevant
7. Be direct and confident, not hedging
8. No markdown headers in content
9. Short paragraphs (2-3 sentences max)
10. No bullet points in prose sections

BANNED PHRASES - NEVER use:
${AI_PATTERNS.slice(0, 30).join(", ")}

OUTPUT: Valid JSON only, no markdown code blocks.`;
}

export async function generateWithRetry(
  attraction: TiqetsAttraction,
  maxRetries: number = 3
): Promise<{ content: GeneratedContentV2; qualityScore: QualityScore } | null> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateAttractionContentV2(attraction);
      
      if (result.qualityScore.passed) {
        console.log(`[Content Generator V2] ✅ Quality passed on attempt ${attempt}`);
        return result;
      }
      
      console.log(`[Content Generator V2] ⚠️ Quality failed on attempt ${attempt}:`, 
        `SEO=${result.qualityScore.seoScore}, AEO=${result.qualityScore.aeoScore}, Fact=${result.qualityScore.factCheckScore}`);
      
      if (attempt === maxRetries) {
        console.log(`[Content Generator V2] ❌ Max retries reached, returning best attempt`);
        return result;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`[Content Generator V2] Error on attempt ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  return null;
}
