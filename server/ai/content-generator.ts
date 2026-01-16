/**
 * Centralized AI Content Generator Service
 * 
 * Unified content generation that enforces SEO standards across all content types.
 * Uses the unified AI provider system with automatic fallback.
 */

import { createLogger } from "../lib/logger";
import { getAllUnifiedProviders, markProviderFailed, type AIMessage } from "./providers";
import {
  SEO_REQUIREMENTS,
  CONTENT_TYPE_REQUIREMENTS,
  BANNED_PHRASES,
  validateContent,
  detectBannedPhrases,
  generateMetaTitle,
  generateMetaDescription,
  type ContentType,
  type SEOValidationResult,
} from "../lib/seo-standards";
import { DUBAI_KEYWORDS, searchTopics, type TopicKeyword } from "@shared/dubai-keywords";
import { 
  type ArticleTemplate, 
  SEO_AEO_TOURISM_TEMPLATE,
  getTemplateById,
  generateTemplatePrompt,
  substituteVariables 
} from "@shared/article-templates";

const logger = createLogger("content-generator");

// ============================================================================
// DUBAI KEYWORD HELPERS
// ============================================================================

/**
 * Find relevant Dubai keywords for a given topic
 * Returns keywords to help the AI use SEO-optimized terminology
 */
function findRelevantDubaiKeywords(topic: string): { 
  relatedTopics: TopicKeyword[];
  suggestedKeywords: string[];
  categoryHint: string;
} {
  const matchingTopics = searchTopics(topic);
  
  // Find which category the topic might belong to
  let categoryHint = "";
  const topicLower = topic.toLowerCase();
  
  for (const [key, category] of Object.entries(DUBAI_KEYWORDS)) {
    if (category.topics.some(t => 
      topicLower.includes(t.topic.toLowerCase()) ||
      t.keywords.some(k => topicLower.includes(k))
    )) {
      categoryHint = category.name;
      break;
    }
  }
  
  // Collect all keywords from matching topics
  const suggestedKeywords: string[] = [];
  for (const topic of matchingTopics.slice(0, 5)) {
    suggestedKeywords.push(...topic.keywords);
  }
  
  return {
    relatedTopics: matchingTopics.slice(0, 5),
    suggestedKeywords: [...new Set(suggestedKeywords)].slice(0, 15),
    categoryHint,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface AudienceRating {
  rating: number;
  notes: string;
}

export interface AudienceSuitability {
  familiesWithChildren?: AudienceRating;
  couples?: AudienceRating;
  soloTravelers?: AudienceRating;
  businessTravelers?: AudienceRating;
  seniors?: AudienceRating;
}

export interface PracticalInfo {
  address?: string;
  hours?: string;
  prices?: string;
  duration?: string;
  gettingThere?: string;
}

export interface NearbyAttraction {
  name: string;
  distance: string;
  description: string;
}

export interface GeneratedContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  content: ContentSection[];
  faqs: FAQ[];
  seoValidation: SEOValidationResult;
  wordCount: number;
  provider: string;
  model: string;
  openingParagraph?: string;
  audienceSuitability?: AudienceSuitability;
  practicalInfo?: PracticalInfo;
  tips?: string[];
  nearbyAttractions?: NearbyAttraction[];
}

export interface ContentSection {
  heading: string; // H2 heading
  content: string; // Paragraph content (HTML)
  imageHint?: string; // Suggested image search term
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface GenerationOptions {
  contentType: ContentType;
  topic: string;
  destination?: string;
  targetKeyword?: string;
  additionalContext?: string;
  minSections?: number;
  maxSections?: number;
  includeAffiliate?: boolean;
  writerPersonality?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildSystemPrompt(contentType: ContentType, writerPersonality?: string): string {
  const requirements = CONTENT_TYPE_REQUIREMENTS[contentType];
  const bannedList = BANNED_PHRASES.slice(0, 20).join('", "');
  
  let personalitySection = "";
  if (writerPersonality) {
    personalitySection = `\n\nWRITING STYLE:
You are writing with this personality: ${writerPersonality}
Adapt your tone, vocabulary, and approach to match this personality while maintaining professionalism.`;
  }
  
  return `You are a professional travel content writer for Travi, a premium travel guide website.

CRITICAL SEO REQUIREMENTS (MUST FOLLOW):
1. Meta title: EXACTLY ${SEO_REQUIREMENTS.metaTitle.minLength}-${SEO_REQUIREMENTS.metaTitle.maxLength} characters
2. Meta description: EXACTLY ${SEO_REQUIREMENTS.metaDescription.minLength}-${SEO_REQUIREMENTS.metaDescription.maxLength} characters
3. Word count: ${requirements.minWords}-${requirements.maxWords} words total
4. H2 sections: ${requirements.h2Count.min}-${requirements.h2Count.max} sections
5. Each section: ${SEO_REQUIREMENTS.wordCount.sectionMinimum}-${SEO_REQUIREMENTS.wordCount.sectionMaximum} words

BANNED PHRASES (NEVER USE):
"${bannedList}"
Instead use professional alternatives like "popular with visitors", "internationally recognized", "notable", "impressive"

CONTENT GUIDELINES:
- Use factual, accurate information only
- Include practical tips and specific details
- Mention prices, opening hours, locations where relevant
- Write for an international audience
- Avoid marketing hype and superlatives
- Include natural opportunities for internal linking${personalitySection}

OUTPUT FORMAT:
Respond ONLY with valid JSON matching the specified structure. No markdown, no extra text.`;
}

/**
 * Build prompt using SEO+AEO article template
 */
function buildTemplateBasedPrompt(template: ArticleTemplate, options: GenerationOptions): string {
  const year = new Date().getFullYear();
  const variables: Record<string, string> = {
    topic: options.topic,
    destination: options.destination || "Dubai",
    year: String(year),
    primary_keyword: options.targetKeyword || options.topic,
    ...(options.templateVariables ?? {}),
  };
  
  // Generate template structure for AI
  const templatePrompt = generateTemplatePrompt(template, variables);
  
  // Find relevant Dubai keywords
  const dubaiKeywords = findRelevantDubaiKeywords(options.topic);
  let keywordSuggestions = "";
  if (dubaiKeywords.suggestedKeywords.length > 0) {
    keywordSuggestions = `\n\nSEO KEYWORD SUGGESTIONS: ${dubaiKeywords.suggestedKeywords.slice(0, 10).join(", ")}`;
  }
  
  return `${templatePrompt}
${options.additionalContext ? `\nADDITIONAL CONTEXT: ${options.additionalContext}` : ""}${keywordSuggestions}

CRITICAL REQUIREMENTS:
1. Meta Title: EXACTLY ${template.metaTitleMaxLength} characters maximum
2. Meta Description: EXACTLY ${template.metaDescriptionMaxLength} characters maximum
3. Opening paragraph MUST answer: What + Where + Who + How much in 4 sentences
4. First sentence MUST be a complete, standalone answer (AEO optimization)
5. Use specific prices in AED, exact addresses, real operating hours
6. NO banned phrases: must-visit, world-class, hidden gem, breathtaking, bucket list, paradise, etc.

Generate JSON with this EXACT structure:
{
  "title": "string - compelling H1 title with year and value",
  "metaTitle": "string - SEO title (EXACTLY 50-60 chars) format: ${template.metaTitleFormat}",
  "metaDescription": "string - SEO description (EXACTLY 150-155 chars)",
  "primaryKeyword": "string - main SEO keyword",
  "secondaryKeywords": ["string", "string", "string"],
  "openingParagraph": "string - 4 sentences answering What/Where/Who/How much (AEO critical)",
  "sections": [
    {
      "heading": "string - H2 heading",
      "content": "string - detailed section content as HTML with paragraphs/lists/tables as needed",
      "imageHint": "string - suggested image search term"
    }
  ],
  "faqs": [
    {
      "question": "string - common question about ${options.topic}",
      "answer": "string - direct, helpful answer (50-100 words)"
    }
  ],
  "audienceSuitability": {
    "familiesWithChildren": { "rating": 1-5, "notes": "string" },
    "couples": { "rating": 1-5, "notes": "string" },
    "soloTravelers": { "rating": 1-5, "notes": "string" },
    "businessTravelers": { "rating": 1-5, "notes": "string" },
    "seniors": { "rating": 1-5, "notes": "string" }
  },
  "practicalInfo": {
    "address": "string - exact address with landmarks",
    "hours": "string - operating hours including holiday variations",
    "prices": "string - prices by category in AED",
    "duration": "string - recommended visit duration",
    "gettingThere": "string - metro, taxi, parking info"
  },
  "tips": ["string - tip 1 (max 2 sentences)", "string - tip 2", "...7 tips total"],
  "nearbyAttractions": [
    {
      "name": "string - attraction name",
      "distance": "string - walking/driving distance",
      "description": "string - brief description"
    }
  ]
}

GENERATE ${template.sections.length} main H2 sections following the template structure above.
Respond with JSON ONLY.`;
}

function buildContentPrompt(options: GenerationOptions): string {
  const requirements = CONTENT_TYPE_REQUIREMENTS[options.contentType];
  const sectionCount = options.minSections || requirements.h2Count.min;
  
  // Check if using a template
  if (options.templateId) {
    const template = getTemplateById(options.templateId);
    if (template) {
      return buildTemplateBasedPrompt(template, options);
    }
  }
  
  let destinationContext = "";
  if (options.destination) {
    destinationContext = `\nDESTINATION CONTEXT: This content is about ${options.destination}. Include location-specific information.`;
  }
  
  let keywordContext = "";
  if (options.targetKeyword) {
    keywordContext = `\nPRIMARY KEYWORD: "${options.targetKeyword}" - Use this naturally 1-2% throughout the content.`;
  }
  
  // Find relevant Dubai keywords for SEO optimization
  const dubaiKeywords = findRelevantDubaiKeywords(options.topic);
  let dubaiKeywordContext = "";
  if (dubaiKeywords.suggestedKeywords.length > 0) {
    dubaiKeywordContext = `\nSEO KEYWORD SUGGESTIONS: Consider naturally incorporating these Dubai-relevant terms: ${dubaiKeywords.suggestedKeywords.slice(0, 8).join(", ")}`;
    if (dubaiKeywords.categoryHint) {
      dubaiKeywordContext += `\nCONTENT CATEGORY: ${dubaiKeywords.categoryHint}`;
    }
  }
  
  return `Generate comprehensive ${options.contentType} content about: ${options.topic}
${destinationContext}${keywordContext}${dubaiKeywordContext}
${options.additionalContext ? `\nADDITIONAL CONTEXT: ${options.additionalContext}` : ""}

Generate JSON with this EXACT structure:
{
  "title": "string - compelling article title (40-70 chars)",
  "metaTitle": "string - SEO title (EXACTLY 50-60 chars)",
  "metaDescription": "string - SEO description (EXACTLY 150-160 chars)",
  "primaryKeyword": "string - main SEO keyword",
  "secondaryKeywords": ["string", "string", "string"],
  "sections": [
    {
      "heading": "string - H2 heading for this section",
      "content": "string - ${SEO_REQUIREMENTS.wordCount.sectionMinimum}-${SEO_REQUIREMENTS.wordCount.sectionMaximum} words of informative content as HTML paragraphs",
      "imageHint": "string - suggested image search term for this section"
    }
  ],
  "faqs": [
    {
      "question": "string - common question travelers ask",
      "answer": "string - helpful, accurate answer (50-100 words)"
    }
  ]
}

REQUIREMENTS:
- Generate EXACTLY ${sectionCount} sections
- Generate 4-6 FAQs
- Total word count: ${requirements.minWords}-${requirements.maxWords} words
- Each section must be ${SEO_REQUIREMENTS.wordCount.sectionMinimum}-${SEO_REQUIREMENTS.wordCount.sectionMaximum} words
- Use real, verifiable information
- Include specific details (prices, times, addresses)
- NO banned phrases or marketing cliches

Respond with JSON ONLY.`;
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

/**
 * Generate content using AI with SEO validation
 */
export async function generateContent(options: GenerationOptions): Promise<GeneratedContent> {
  const providers = getAllUnifiedProviders();
  
  if (providers.length === 0) {
    throw new Error("No AI providers available for content generation");
  }
  
  const systemPrompt = buildSystemPrompt(options.contentType, options.writerPersonality);
  const userPrompt = buildContentPrompt(options);
  
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  
  let lastError: Error | null = null;
  
  for (const provider of providers) {
    try {
      logger.info(`Generating ${options.contentType} content for "${options.topic}" using ${provider.name}`);
      
      const result = await provider.generateCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 8000,
        responseFormat: { type: "json_object" },
      });
      
      // Parse and validate the response
      const content = parseAndValidateResponse(result.content, options);
      
      logger.info(`Successfully generated content using ${provider.name}: ${content.wordCount} words, SEO score: ${content.seoValidation.score}`);
      
      return {
        ...content,
        provider: provider.name,
        model: result.model,
      };
    } catch (error) {
      logger.warn({ error: String(error) }, `Provider ${provider.name} failed for content generation`);
      markProviderFailed(provider.name);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }
  
  throw lastError || new Error("All AI providers failed to generate content");
}

/**
 * Parse AI response and validate against SEO standards
 */
function parseAndValidateResponse(responseContent: string, options: GenerationOptions): Omit<GeneratedContent, "provider" | "model"> {
  // Clean up response
  let jsonStr = responseContent.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }
  
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${e}`);
  }
  
  // Extract and structure content
  const sections: ContentSection[] = (parsed.sections || []).map((s: { heading?: string; content?: string; imageHint?: string }) => ({
    heading: s.heading || "",
    content: s.content || "",
    imageHint: s.imageHint,
  }));
  
  const faqs: FAQ[] = (parsed.faqs || []).map((f: { question?: string; answer?: string }) => ({
    question: f.question || "",
    answer: f.answer || "",
  }));
  
  // Build HTML content for validation
  let htmlContent = "";
  for (const section of sections) {
    htmlContent += `<h2>${section.heading}</h2>\n${section.content}\n`;
  }
  
  // Calculate word count
  const textContent = htmlContent.replace(/<[^>]+>/g, " ");
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  
  // Generate proper meta title and description if they don't meet requirements
  let metaTitle = parsed.metaTitle || generateMetaTitle(parsed.title, options.destination);
  let metaDescription = parsed.metaDescription || generateMetaDescription(parsed.title);
  
  // Fix meta title length if needed
  if (metaTitle.length < SEO_REQUIREMENTS.metaTitle.minLength || metaTitle.length > SEO_REQUIREMENTS.metaTitle.maxLength) {
    metaTitle = generateMetaTitle(parsed.title, options.destination);
  }
  
  // Fix meta description length if needed
  if (metaDescription.length < SEO_REQUIREMENTS.metaDescription.minLength || metaDescription.length > SEO_REQUIREMENTS.metaDescription.maxLength) {
    metaDescription = generateMetaDescription(parsed.title);
  }
  
  // Validate content against SEO standards
  const seoValidation = validateContent(
    {
      title: parsed.title || options.topic,
      metaTitle,
      metaDescription,
      htmlContent,
      primaryKeyword: parsed.primaryKeyword,
    },
    options.contentType
  );
  
  // Extract template-specific fields if present
  const openingParagraph = parsed.openingParagraph;
  const audienceSuitability = parsed.audienceSuitability as AudienceSuitability | undefined;
  const practicalInfo = parsed.practicalInfo as PracticalInfo | undefined;
  const tips = Array.isArray(parsed.tips) ? parsed.tips as string[] : undefined;
  const nearbyAttractions = Array.isArray(parsed.nearbyAttractions) 
    ? (parsed.nearbyAttractions as NearbyAttraction[]) 
    : undefined;
  
  return {
    title: parsed.title || options.topic,
    metaTitle,
    metaDescription,
    primaryKeyword: parsed.primaryKeyword || options.targetKeyword || options.topic,
    secondaryKeywords: parsed.secondaryKeywords || [],
    content: sections,
    faqs,
    seoValidation,
    wordCount,
    openingParagraph,
    audienceSuitability,
    practicalInfo,
    tips,
    nearbyAttractions,
  };
}

// ============================================================================
// CONTENT IMPROVEMENT
// ============================================================================

/**
 * Improve content that failed SEO validation
 */
export async function improveContent(
  content: GeneratedContent,
  targetScore: number = 80
): Promise<GeneratedContent> {
  if (content.seoValidation.score >= targetScore) {
    return content;
  }
  
  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error("No AI providers available");
  }
  
  const issues = [
    ...content.seoValidation.errors.map((e) => e.message),
    ...content.seoValidation.warnings.map((w) => w.message),
  ].join("\n- ");
  
  const currentHtml = content.content.map((s) => `<h2>${s.heading}</h2>\n${s.content}`).join("\n");
  
  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are an SEO content editor. Fix the following issues in the content while preserving accuracy and readability.
      
ISSUES TO FIX:
- ${issues}

Return the improved content in the same JSON structure, with all issues resolved.`,
    },
    {
      role: "user",
      content: `Current content:
${JSON.stringify({
  title: content.title,
  metaTitle: content.metaTitle,
  metaDescription: content.metaDescription,
  sections: content.content,
  faqs: content.faqs,
}, null, 2)}

Fix all SEO issues and return improved JSON.`,
    },
  ];
  
  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages,
        temperature: 0.5,
        maxTokens: 8000,
        responseFormat: { type: "json_object" },
      });
      
      const improved = parseAndValidateResponse(result.content, {
        contentType: "article",
        topic: content.title,
      });
      
      if (improved.seoValidation.score > content.seoValidation.score) {
        return {
          ...improved,
          provider: provider.name,
          model: result.model,
        };
      }
    } catch (error) {
      logger.warn({ error: String(error) }, `Provider ${provider.name} failed for content improvement`);
      continue;
    }
  }
  
  return content;
}

// ============================================================================
// SPECIALIZED GENERATORS
// ============================================================================

/**
 * Generate destination page content
 */
export async function generateDestinationContent(
  destination: string,
  country: string,
  additionalContext?: string
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "destination",
    topic: `Complete travel guide to ${destination}, ${country}`,
    destination: `${destination}, ${country}`,
    targetKeyword: `${destination} travel guide`,
    additionalContext: additionalContext || `Include information about attractions, hotels, dining, transportation, and travel tips for ${destination}.`,
    minSections: 6,
    maxSections: 8,
  });
}

/**
 * Generate article content
 */
export async function generateArticleContent(
  topic: string,
  options?: {
    destination?: string;
    targetKeyword?: string;
    writerPersonality?: string;
    additionalContext?: string;
  }
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "article",
    topic,
    destination: options?.destination,
    targetKeyword: options?.targetKeyword,
    writerPersonality: options?.writerPersonality,
    additionalContext: options?.additionalContext,
    minSections: 4,
    maxSections: 6,
  });
}

/**
 * Generate hotel description
 */
export async function generateHotelContent(
  hotelName: string,
  destination: string,
  hotelDetails?: {
    starRating?: number;
    amenities?: string[];
    priceRange?: string;
  }
): Promise<GeneratedContent> {
  let additionalContext = `Hotel: ${hotelName} in ${destination}.`;
  if (hotelDetails?.starRating) {
    additionalContext += ` ${hotelDetails.starRating}-star property.`;
  }
  if (hotelDetails?.amenities?.length) {
    additionalContext += ` Amenities include: ${hotelDetails.amenities.join(", ")}.`;
  }
  if (hotelDetails?.priceRange) {
    additionalContext += ` Price range: ${hotelDetails.priceRange}.`;
  }
  
  return generateContent({
    contentType: "hotel",
    topic: `${hotelName} - Hotel Review and Guide`,
    destination,
    targetKeyword: hotelName,
    additionalContext,
    minSections: 3,
    maxSections: 5,
  });
}

/**
 * Generate attraction description
 */
export async function generateAttractionContent(
  attractionName: string,
  destination: string,
  attractionDetails?: {
    category?: string;
    duration?: string;
    ticketPrice?: string;
  }
): Promise<GeneratedContent> {
  let additionalContext = `Attraction: ${attractionName} in ${destination}.`;
  if (attractionDetails?.category) {
    additionalContext += ` Category: ${attractionDetails.category}.`;
  }
  if (attractionDetails?.duration) {
    additionalContext += ` Typical visit duration: ${attractionDetails.duration}.`;
  }
  if (attractionDetails?.ticketPrice) {
    additionalContext += ` Ticket price: ${attractionDetails.ticketPrice}.`;
  }
  
  return generateContent({
    contentType: "attraction",
    topic: `${attractionName} - Complete Visitor Guide`,
    destination,
    targetKeyword: attractionName,
    additionalContext,
    minSections: 3,
    maxSections: 4,
  });
}

/**
 * Generate SEO+AEO optimized tourism content using template
 * Uses the structured template format for maximum SEO/AEO compliance
 */
export async function generateSeoAeoContent(
  topic: string,
  options?: {
    destination?: string;
    targetKeyword?: string;
    bookingLink?: string;
    contentType?: ContentType;
    category?: string;
    language?: string;
    wordCount?: number;
    writerPersonality?: string;
    additionalContext?: string;
  }
): Promise<GeneratedContent> {
  const templateVariables: Record<string, string> = {
    booking_link: options?.bookingLink || "",
    category: options?.category || "attraction",
    language: options?.language || "en",
    word_count: String(options?.wordCount || 2500),
  };
  
  return generateContent({
    contentType: options?.contentType || "attraction",
    topic,
    destination: options?.destination || "Dubai",
    targetKeyword: options?.targetKeyword || topic,
    writerPersonality: options?.writerPersonality,
    additionalContext: options?.additionalContext,
    templateId: "seo-aeo-tourism",
    templateVariables,
    minSections: 6,
    maxSections: 8,
  });
}

/**
 * Generate listicle content (Top X articles)
 */
export async function generateListicleContent(
  topic: string,
  count: number = 10,
  options?: {
    destination?: string;
    targetKeyword?: string;
    bookingLink?: string;
    writerPersonality?: string;
  }
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "article",
    topic: `Top ${count} ${topic}`,
    destination: options?.destination || "Dubai",
    targetKeyword: options?.targetKeyword || topic,
    writerPersonality: options?.writerPersonality,
    templateId: "listicle",
    templateVariables: {
      count: String(count),
      booking_link: options?.bookingLink || "",
    },
    minSections: count + 2,
    maxSections: count + 4,
  });
}

/**
 * Generate comparison content (A vs B)
 */
export async function generateComparisonContent(
  optionA: string,
  optionB: string,
  options?: {
    destination?: string;
    bookingLinkA?: string;
    bookingLinkB?: string;
    writerPersonality?: string;
  }
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "article",
    topic: `${optionA} vs ${optionB}`,
    destination: options?.destination || "Dubai",
    targetKeyword: `${optionA} vs ${optionB}`,
    writerPersonality: options?.writerPersonality,
    templateId: "comparison",
    templateVariables: {
      option_a: optionA,
      option_b: optionB,
      booking_link_a: options?.bookingLinkA || "",
      booking_link_b: options?.bookingLinkB || "",
    },
    minSections: 4,
    maxSections: 6,
  });
}

/**
 * Generate budget guide content
 */
export async function generateBudgetGuideContent(
  topic: string,
  options?: {
    destination?: string;
    targetKeyword?: string;
    bookingLink?: string;
    writerPersonality?: string;
  }
): Promise<GeneratedContent> {
  return generateContent({
    contentType: "article",
    topic: `${topic} on a Budget`,
    destination: options?.destination || "Dubai",
    targetKeyword: options?.targetKeyword || `${topic} budget`,
    writerPersonality: options?.writerPersonality,
    templateId: "budget-guide",
    templateVariables: {
      booking_link: options?.bookingLink || "",
    },
    minSections: 5,
    maxSections: 7,
  });
}

// ============================================================================
// CONTENT VALIDATION HELPERS
// ============================================================================

/**
 * Check if content meets minimum quality threshold
 */
export function meetsQualityThreshold(content: GeneratedContent, minScore: number = 80): boolean {
  return content.seoValidation.score >= minScore && 
         content.seoValidation.errors.filter((e) => e.severity === "critical").length === 0;
}

/**
 * Get improvement suggestions for content
 */
export function getImprovementSuggestions(content: GeneratedContent): string[] {
  const suggestions: string[] = [...content.seoValidation.suggestions];
  
  // Add word count suggestions
  const requirements = CONTENT_TYPE_REQUIREMENTS.article;
  if (content.wordCount < requirements.minWords) {
    suggestions.push(`Add ${requirements.minWords - content.wordCount} more words to meet minimum word count`);
  }
  
  // Add section suggestions
  if (content.content.length < requirements.h2Count.min) {
    suggestions.push(`Add ${requirements.h2Count.min - content.content.length} more H2 sections`);
  }
  
  return suggestions;
}
