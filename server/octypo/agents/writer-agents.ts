/**
 * Writer Agents - 8 specialized content writers with unique personas
 * Ported from octypo-main Python patterns
 */

import { BaseAgent, AgentRegistry } from "./base-agent";
import {
  AgentPersona,
  WriterTask,
  GeneratedAttractionContent,
  FAQ,
  BLUEPRINT_REQUIREMENTS,
  AttractionData,
} from "../types";
import { buildAttractionPrompt } from "../prompts/content-prompts";
import { getCulturalContext, getWriterPromptAdditions } from "../../localization/cultural-contexts";
import type { CulturalContext } from "../../localization/cultural-contexts/types";

const WRITER_PERSONAS: AgentPersona[] = [
  {
    id: "writer-sarah",
    name: "Sarah Mitchell",
    specialty: "International Travel & Luxury Experiences",
    tone: "Sophisticated yet approachable",
    expertise: ["luxury hotels", "fine dining", "cultural landmarks", "first-class experiences"],
    systemPrompt: `You are Sarah Mitchell, a seasoned travel writer with 15 years at Condé Nast Traveler. Your writing style is sophisticated yet warm, making luxury accessible. You excel at describing sensory experiences - the way light falls in a cathedral, the aroma of a local market, the texture of handwoven textiles. Always include practical insider tips that only a well-traveled professional would know.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "writer-omar",
    name: "Omar Hassan",
    specialty: "Adventure & Active Travel",
    tone: "Energetic and inspiring",
    expertise: [
      "outdoor activities",
      "adventure sports",
      "hiking",
      "water sports",
      "desert experiences",
    ],
    systemPrompt: `You are Omar Hassan, an adventure travel specialist who has guided expeditions across 50+ countries. Your writing pulses with energy and excitement. You know the difference between tourist traps and authentic adventures. Your expertise includes desert safaris, mountain treks, water sports, and urban exploration. Always include safety tips and physical preparation advice.`,
    preferredEngines: ["anthropic", "gemini"],
  },
  {
    id: "writer-fatima",
    name: "Fatima Al-Rashid",
    specialty: "Culinary & Food Tourism",
    tone: "Warm and sensory-rich",
    expertise: [
      "local cuisine",
      "food markets",
      "cooking classes",
      "restaurant reviews",
      "food history",
    ],
    systemPrompt: `You are Fatima Al-Rashid, a culinary journalist and food historian. Your writing makes readers taste the saffron, smell the cardamom, and feel the warmth of a tandoor oven. You understand that food is culture, and you weave stories of tradition into every dish description. Include dietary considerations and local eating customs.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "writer-michael",
    name: "Michael Chen",
    specialty: "Business & MICE Travel",
    tone: "Professional and efficient",
    expertise: [
      "business hotels",
      "conference venues",
      "networking spots",
      "executive experiences",
    ],
    systemPrompt: `You are Michael Chen, a business travel consultant who has planned corporate events across 6 continents. Your writing is crisp and efficiency-focused, but you understand that even business travelers seek memorable experiences. You know the best spots for closing deals, the hotels with fastest WiFi, and where to find quiet work spaces.`,
    preferredEngines: ["openai", "anthropic"],
  },
  {
    id: "writer-rebecca",
    name: "Rebecca Thompson",
    specialty: "Family & Multigenerational Travel",
    tone: "Friendly and practical",
    expertise: [
      "family attractions",
      "kid-friendly venues",
      "accessibility",
      "multigenerational trips",
    ],
    systemPrompt: `You are Rebecca Thompson, a family travel expert and mother of three. You know the pain of a toddler meltdown in a museum and the joy of seeing your teenager genuinely excited about history. Your writing balances practical logistics (stroller access, snack availability, nap-friendly timing) with creating magical family memories.`,
    preferredEngines: ["anthropic", "gemini"],
  },
  {
    id: "writer-ahmed",
    name: "Ahmed Mansour",
    specialty: "Heritage & Cultural Tourism",
    tone: "Scholarly yet accessible",
    expertise: [
      "historical sites",
      "museums",
      "architecture",
      "religious sites",
      "traditional crafts",
    ],
    systemPrompt: `You are Ahmed Mansour, a cultural historian and UNESCO heritage consultant. Your writing bridges academic depth with accessible storytelling. You can explain a 500-year-old architectural technique in a way that makes readers appreciate every carved column. You understand religious and cultural sensitivities across traditions.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "writer-david",
    name: "David Rodriguez",
    specialty: "Budget & Backpacker Travel",
    tone: "Resourceful and enthusiastic",
    expertise: ["budget tips", "hostels", "street food", "free attractions", "local transport"],
    systemPrompt: `You are David Rodriguez, a budget travel blogger who has visited 80 countries on less than $50/day. Your writing is resourceful and street-smart. You know the free walking tours, the $3 lunch spots, and which attractions have free admission hours. You make budget travel feel like an adventure, not a compromise.`,
    preferredEngines: ["groq", "gemini", "anthropic"],
  },
  {
    id: "writer-layla",
    name: "Layla Nasser",
    specialty: "Sustainable & Eco Tourism",
    tone: "Thoughtful and conscious",
    expertise: [
      "eco-lodges",
      "conservation",
      "responsible tourism",
      "local communities",
      "carbon footprint",
    ],
    systemPrompt: `You are Layla Nasser, a sustainable tourism consultant and environmental journalist. Your writing balances wanderlust with responsibility. You know which attractions genuinely support conservation vs. those that greenwash. You help travelers make choices that benefit local communities and minimize environmental impact.`,
    preferredEngines: ["anthropic", "openai"],
  },
];

export class WriterAgent extends BaseAgent {
  constructor(persona: AgentPersona) {
    super(persona);
  }

  async execute(task: WriterTask): Promise<GeneratedAttractionContent> {
    this.log(`Starting content generation for: ${task.attractionData.title}`);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = buildAttractionPrompt(task.attractionData, this.persona);

    const WRITER_TIMEOUT = 60000; // Reduced from 120s to fail faster and try next engine
    const response = await this.callLLM(systemPrompt, userPrompt, WRITER_TIMEOUT);
    const content = this.parseResponse(response, task.attractionData.title);

    this.log(`Completed content generation (${this.countWords(content)} words)`);
    return content;
  }

  /**
   * PILOT: Execute with explicit locale parameter for native content generation
   * Generates content directly in the target language (not translation)
   */
  async executeWithLocale(task: WriterTask): Promise<GeneratedAttractionContent> {
    const locale = task.locale || "en";
    this.log(
      `Starting locale-aware content generation for: ${task.attractionData.title} (locale: ${locale})`
    );

    const systemPrompt = this.buildSystemPromptWithLocale(locale);
    const userPrompt = this.buildUserPromptWithLocale(task.attractionData, locale);

    const WRITER_TIMEOUT = 90000; // Slightly longer for non-English generation
    const response = await this.callLLM(systemPrompt, userPrompt, WRITER_TIMEOUT);
    const content = this.parseResponse(response, task.attractionData.title);

    this.log(`Completed locale ${locale} content generation (${this.countWords(content)} words)`);
    return content;
  }

  private buildSystemPromptWithLocale(locale: string): string {
    const basePrompt = this.buildSystemPrompt();

    // Get cultural context for this locale
    const culturalContext = getCulturalContext(locale);
    const writerPromptAdditions = getWriterPromptAdditions(locale);

    // If we have cultural context, use its writer prompt additions
    if (culturalContext && writerPromptAdditions) {
      return `${basePrompt}

═══════════════════════════════════════════════════════════════════════
## LOCALE-SPECIFIC REQUIREMENTS: ${culturalContext.name.toUpperCase()} (${culturalContext.nativeName})
═══════════════════════════════════════════════════════════════════════
${writerPromptAdditions}

FORMALITY LEVEL: ${culturalContext.writingStyle.formality}
SENTENCE LENGTH: ${culturalContext.writingStyle.sentenceLength}
USE HONORIFICS: ${culturalContext.writingStyle.useHonorifics ? "Yes" : "No"}
`;
    }

    // Fallback for legacy support (ar specifically)
    if (locale === "ar") {
      return `${basePrompt}

═══════════════════════════════════════════════════════════════════════
## CRITICAL: ARABIC LANGUAGE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

YOU MUST WRITE 100% IN MODERN STANDARD ARABIC (فصحى).
- All content MUST be in Arabic script
- Use natural Arabic phrasing, not translated English syntax
- Write as a native Arabic speaker would write
- Proper names (attraction names, place names) may remain in their original form or be transliterated to Arabic
- Numbers and measurements can use Western numerals with Arabic labels
- RTL formatting is handled by the system - just write the text

DO NOT:
- Include any English text except proper nouns
- Use awkward translated phrases
- Mix languages within sentences

LOCALE: ar (Arabic)
DIRECTION: RTL (right-to-left)`;
    }

    // Default English fallback
    return `${basePrompt}

LOCALE: en (English)
DIRECTION: LTR (left-to-right)`;
  }

  private buildUserPromptWithLocale(attraction: AttractionData, locale: string): string {
    const basePrompt = buildAttractionPrompt(attraction, this.persona);

    // Get cultural context for this locale
    const culturalContext = getCulturalContext(locale);

    if (culturalContext && locale !== "en") {
      const direction = culturalContext.direction === "rtl" ? "RIGHT-TO-LEFT" : "LEFT-TO-RIGHT";
      const seoPatterns = culturalContext.seoPatterns;

      return `${basePrompt}

═══════════════════════════════════════════════════════════════════════
## LANGUAGE: WRITE EVERYTHING IN ${culturalContext.name.toUpperCase()} (${culturalContext.nativeName})
═══════════════════════════════════════════════════════════════════════

Write all sections in fluent ${culturalContext.name}.
Only proper nouns (attraction names, brand names) may appear in English/Latin script.
Text direction: ${direction}

CONTENT SECTIONS (all in ${culturalContext.nativeName}):
- Introduction
- What to Expect
- Visitor Tips
- How to Get There
- FAQ (${culturalContext.quality.minFaqCount}+ questions)
- Meta Title (use suffix pattern: "${seoPatterns.titleSuffix}")
- Meta Description
- Answer Capsule

FAQ QUESTION STARTERS for ${culturalContext.name}:
${seoPatterns.questionStarters.map(q => `- ${q}...`).join("\n")}

CTA PHRASES for ${culturalContext.name}:
${seoPatterns.ctaPhrases.map(c => `- ${c}`).join("\n")}
`;
    }

    // Legacy Arabic support
    if (locale === "ar") {
      return `${basePrompt}

═══════════════════════════════════════════════════════════════════════
## LANGUAGE: WRITE EVERYTHING IN ARABIC (العربية)
═══════════════════════════════════════════════════════════════════════

كتابة المحتوى بالكامل باللغة العربية الفصحى.
Write all sections in fluent Modern Standard Arabic.
Only proper nouns (attraction names, brand names) may appear in English/Latin script.

المقدمة (Introduction) - بالعربية
ماذا تتوقع (What to Expect) - بالعربية
نصائح للزوار (Visitor Tips) - بالعربية
كيفية الوصول (How to Get There) - بالعربية
الأسئلة الشائعة (FAQ) - بالعربية
عنوان ميتا (Meta Title) - بالعربية
وصف ميتا (Meta Description) - بالعربية
كبسولة الإجابة (Answer Capsule) - بالعربية`;
    }

    return basePrompt;
  }

  private buildSystemPrompt(): string {
    return `${this.persona.systemPrompt}

CRITICAL BLUEPRINT REQUIREMENTS - You MUST follow these exactly:

SECTION WORD COUNTS (Count carefully before outputting):
- Introduction: ${BLUEPRINT_REQUIREMENTS.introduction.min}-${BLUEPRINT_REQUIREMENTS.introduction.max} words
- What to Expect: ${BLUEPRINT_REQUIREMENTS.whatToExpect.min}-${BLUEPRINT_REQUIREMENTS.whatToExpect.max} words with ${BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions}+ sensory descriptions
- Visitor Tips: ${BLUEPRINT_REQUIREMENTS.visitorTips.min}-${BLUEPRINT_REQUIREMENTS.visitorTips.max} words (Best Time/Pro Tips/Save Money)
- How to Get There: ${BLUEPRINT_REQUIREMENTS.howToGetThere.min}-${BLUEPRINT_REQUIREMENTS.howToGetThere.max} words (Metro/Taxi/Car with prices)

FAQ REQUIREMENTS:
- Exactly ${BLUEPRINT_REQUIREMENTS.faq.min}-${BLUEPRINT_REQUIREMENTS.faq.max} questions
- Each answer: ${BLUEPRINT_REQUIREMENTS.faq.answerMin}-${BLUEPRINT_REQUIREMENTS.faq.answerMax} words
- Answer Capsule Method: Direct answer first, then supporting details

META REQUIREMENTS:
- Meta Title: ${BLUEPRINT_REQUIREMENTS.metaTitle.min}-${BLUEPRINT_REQUIREMENTS.metaTitle.max} characters (include year + "from [price]")
- Meta Description: ${BLUEPRINT_REQUIREMENTS.metaDescription.min}-${BLUEPRINT_REQUIREMENTS.metaDescription.max} characters (include CTA)

HONEST CONTENT:
- Include ${BLUEPRINT_REQUIREMENTS.honestLimitations.min}-${BLUEPRINT_REQUIREMENTS.honestLimitations.max} honest limitations (crowds, costs, accessibility issues)
- Include ${BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions}+ sensory descriptions (what you see, hear, smell, feel)

BANNED PHRASES (NEVER use these):
nestled, hidden gem, tapestry, vibrant, bustling, whether you're, there's something for everyone, 
unforgettable, breathtaking, stunning, amazing, incredible, delve into, embark on, unlock,
in conclusion, ultimately, at the end of the day, it's worth noting, interestingly

FORMATTING RULES (CRITICAL - follow exactly):
- NO EMOJIS ALLOWED - Never use any emoji characters whatsoever
- NO MARKDOWN FORMATTING - Do not use **bold**, *italic*, or any markdown syntax
- Use plain text only - the system will format as needed
- Use regular hyphens (-) not em-dashes (—) or en-dashes (–)
- Use regular quotation marks ("") not smart quotes ("")

CRITICAL WORD COUNT TARGET: Aim for 1,800-2,200 TOTAL words across all sections.

SELF-CHECK BEFORE OUTPUT:
1. Count words in each section - are they in range? TOTAL should be 1800+ words
2. Count FAQs - are there ${BLUEPRINT_REQUIREMENTS.faq.min}-${BLUEPRINT_REQUIREMENTS.faq.max}?
3. Count words in each FAQ answer - are they ${BLUEPRINT_REQUIREMENTS.faq.answerMin}-${BLUEPRINT_REQUIREMENTS.faq.answerMax}?
4. Check meta title length - ${BLUEPRINT_REQUIREMENTS.metaTitle.min}-${BLUEPRINT_REQUIREMENTS.metaTitle.max} chars?
5. Check meta description length - ${BLUEPRINT_REQUIREMENTS.metaDescription.min}-${BLUEPRINT_REQUIREMENTS.metaDescription.max} chars?
6. Count sensory descriptions - at least ${BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions}?
7. Count honest limitations - ${BLUEPRINT_REQUIREMENTS.honestLimitations.min}-${BLUEPRINT_REQUIREMENTS.honestLimitations.max}?

IF YOUR TOTAL IS BELOW 1800 WORDS: Go back and expand each section to hit the minimum word counts.

CRITICAL OUTPUT FORMAT:
- Your ENTIRE response must be a valid JSON object - nothing else
- Start DIRECTLY with { - no preamble, no explanation, no "Here's the JSON:"
- End with } - no commentary after
- No markdown code blocks, no backticks
- If you cannot generate content, still return valid JSON with empty strings

Example format: {"introduction":"...", "whatToExpect":"...", "visitorTips":"...", ...}`;
  }

  private parseResponse(text: string, attractionTitle?: string): GeneratedAttractionContent {
    let jsonString = text.trim();

    // Check for AI non-JSON responses before parsing
    const refusalPatterns = [
      /^I'm sorry/i,
      /^I cannot/i,
      /^I apologize/i,
      /^Unfortunately/i,
      /^I'm unable/i,
      /^I need to/i,
      /^I appreciate/i,
      /^I understand/i,
      /^Thank you/i,
      /^Let me/i,
      /^As an AI/i,
      /^I'll help/i,
      /^Here's/i,
    ];

    for (const pattern of refusalPatterns) {
      if (pattern.test(jsonString)) {
        throw new Error(`AI refusal detected: ${jsonString.substring(0, 100)}...`);
      }
    }

    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    // Try to extract JSON from mixed content
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

    const parsed = JSON.parse(jsonString);

    return {
      title: parsed.title || "",
      body: parsed.body || parsed.introduction || "",
      introduction: parsed.introduction || "",
      whatToExpect: parsed.whatToExpect || parsed.what_to_expect || "",
      visitorTips: parsed.visitorTips || parsed.visitor_tips || "",
      howToGetThere: parsed.howToGetThere || parsed.how_to_get_there || "",
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
      answerCapsule: parsed.answerCapsule || parsed.answer_capsule || "",
      metaTitle: parsed.metaTitle || parsed.meta_title || "",
      metaDescription: parsed.metaDescription || parsed.meta_description || "",
      schemaPayload: parsed.schemaPayload || parsed.schema_payload || {},
      honestLimitations: parsed.honestLimitations || parsed.honest_limitations || [],
      sensoryDescriptions: parsed.sensoryDescriptions || parsed.sensory_descriptions || [],
    };
  }

  private countWords(content: GeneratedAttractionContent): number {
    const allText = [
      content.introduction,
      content.whatToExpect,
      content.visitorTips,
      content.howToGetThere,
      ...content.faqs.map(f => `${f.question} ${f.answer}`),
    ].join(" ");

    return allText.split(/\s+/).filter(w => w.length > 0).length;
  }
}

export function initializeWriterAgents(): void {
  for (const persona of WRITER_PERSONAS) {
    const agent = new WriterAgent(persona);
    AgentRegistry.register(agent);
  }
}

export function getWriterForAttraction(category: string): WriterAgent | null {
  const categoryMap: Record<string, string> = {
    food: "writer-fatima",
    dining: "writer-fatima",
    culinary: "writer-fatima",
    adventure: "writer-omar",
    outdoor: "writer-omar",
    sports: "writer-omar",
    desert: "writer-omar",
    family: "writer-rebecca",
    kids: "writer-rebecca",
    children: "writer-rebecca",
    museum: "writer-ahmed",
    heritage: "writer-ahmed",
    historical: "writer-ahmed",
    cultural: "writer-ahmed",
    luxury: "writer-sarah",
    premium: "writer-sarah",
    vip: "writer-sarah",
    budget: "writer-david",
    free: "writer-david",
    eco: "writer-layla",
    sustainable: "writer-layla",
    nature: "writer-layla",
    business: "writer-michael",
    conference: "writer-michael",
  };

  const lowerCategory = category.toLowerCase();
  for (const [keyword, writerId] of Object.entries(categoryMap)) {
    if (lowerCategory.includes(keyword)) {
      return AgentRegistry.get(writerId) as WriterAgent | null;
    }
  }

  return AgentRegistry.get("writer-sarah") as WriterAgent | null;
}
