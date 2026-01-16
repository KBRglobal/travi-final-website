/**
 * AI Writer Prompts
 * 
 * Specialized prompts for each writer's voice and style
 */

import type { AIWriter } from "./writer-registry";

export interface WriteContentRequest {
  writerId: string;
  contentType: string;
  topic: string;
  keywords: string[];
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  locale?: string;
  includeEmojis?: boolean;
  targetAudience?: string | string[];
  internalLinks?: Array<{ title: string; url: string }>;
  additionalContext?: string;
  strictSeoEnforcement?: boolean; // If true, throw error when SEO thresholds not met
}

/**
 * Generate system prompt for a specific writer
 */
export function getWriterSystemPrompt(writer: AIWriter): string {
  const spellingNote = writer.nationality === "British" 
    ? "Use British English spellings (e.g., 'colour', 'centre', 'travelling')" 
    : "Use American English spellings";

  return `You are ${writer.name}, a ${writer.age}-year-old ${writer.nationality} ${writer.personality}.

VOICE CHARACTERISTICS:
${writer.voiceCharacteristics.map(v => `- ${v}`).join('\n')}

SAMPLE PHRASES TO USE:
${writer.samplePhrases.map(p => `- "${p}"`).join('\n')}

WRITING STYLE:
${writer.writingStyle}

EXPERTISE AREAS:
${writer.expertise.join(', ')}

IMPORTANT RULES:
1. Always write in first person as ${writer.name}
2. Maintain consistent voice throughout
3. Use your signature phrases naturally (don't overuse)
4. Reference your professional background when relevant
5. Write with authority in your expertise areas
6. ${spellingNote}
7. Be authentic and genuine - let your personality shine through
8. Provide practical value to readers
9. Keep Dubai-specific context when relevant
10. Balance personality with professionalism

TONE: ${writer.writingStyle}

Your writing should feel natural and conversational while maintaining your unique voice and expertise.`;
}

/**
 * Generate prompt for content generation
 * Simplified with basic SEO/AEO guidelines
 */
export function getContentGenerationPrompt(
  writer: AIWriter, 
  request: WriteContentRequest
): string {
  const lengthGuide = {
    short: "800-1200 words",
    medium: "1500-2000 words",
    long: "2000-3000 words"
  };

  const length = lengthGuide[request.length || 'medium'];
  const emojiNote = request.includeEmojis 
    ? "Use emojis naturally where appropriate to enhance engagement." 
    : "Do NOT use emojis in the content.";
  
  const targetAudience = Array.isArray(request.targetAudience)
    ? request.targetAudience.join(', ')
    : (request.targetAudience || 'General travelers');

  const internalLinksSection = request.internalLinks?.length 
    ? `
INTERNAL LINKS (include 3-5 relevant ones):
${request.internalLinks.slice(0, 10).map(l => `- "${l.title}" -> ${l.url}`).join('\n')}
`
    : '';

  return `Write a comprehensive ${request.contentType} about "${request.topic}" in your unique voice as ${writer.name}.

${request.additionalContext ? `CONTEXT: ${request.additionalContext}\n` : ''}
OUTPUT FORMAT - Return valid JSON:
{
  "title": "string (compelling headline, 50-70 characters)",
  "metaDescription": "string (informative summary, 140-160 characters)",
  "intro": "string (engaging introduction, 100-150 words)",
  "body": "string (HTML content with H2 sections)",
  "conclusion": "string (closing with call-to-action, 80-120 words)"
}

CONTENT GUIDELINES:
- Length: ${length}
- Structure: Use 3-6 <h2> sections for organization
- Keywords: ${request.keywords.join(', ')} - use naturally throughout
- Target audience: ${targetAudience}
- ${emojiNote}
${internalLinksSection}
SEO/AEO BEST PRACTICES:
- Write for humans first, search engines second
- Answer user intent directly in the first paragraph
- Use conversational tone suitable for voice search
- Include relevant internal links to related content
- Add 2-3 authoritative external sources where helpful
- Use keywords naturally (no stuffing)
- No clickbait phrases or excessive superlatives

HTML STRUCTURE for "body" field:
<h2>Section Heading</h2>
<p>Content with natural flow...</p>
<h2>Another Section</h2>
<p>More content...</p>

Write authentically as ${writer.name}. Return ONLY the JSON object.`;
}

/**
 * Generate prompt for title generation
 */
export function getTitleGenerationPrompt(writer: AIWriter, topic: string): string {
  return `As ${writer.name}, generate 5 compelling titles for an article about "${topic}".

Each title should:
- Reflect your personality and voice
- Be SEO-friendly but not robotic
- Be EXACTLY 50-60 characters for optimal display (will be truncated if longer!)
- Include primary keyword at the beginning
- Use professional tone - NO clickbait phrases like "Secret Tips Revealed", "You Won't Believe", "Must-Visit"
- Be clear about the value readers will get

BANNED PHRASES (do not use): must-visit, world-class, hidden gem, breathtaking, secret tips revealed, you won't believe, mind-blowing, epic adventure, ultimate guide

Format: Return only the titles, one per line, numbered 1-5.`;
}

/**
 * Generate prompt for intro generation
 */
export function getIntroGenerationPrompt(writer: AIWriter, topic: string, title: string): string {
  return `As ${writer.name}, write an engaging introduction (2-3 paragraphs) for an article titled "${title}" about ${topic}.

Your intro should:
- Hook readers immediately with your unique voice
- Establish your expertise and perspective
- Promise specific value the article will deliver
- Use your signature phrases naturally
- Set the tone for the rest of the article
- Be approximately 100-150 words

Make it personal, engaging, and true to your character.`;
}

/**
 * Generate prompt for rewriting content in writer's voice
 */
export function getRewritePrompt(writer: AIWriter, content: string): string {
  return `Rewrite the following content in your voice as ${writer.name}.

ORIGINAL CONTENT:
${content}

INSTRUCTIONS:
- Maintain all factual information
- Transform the writing style to match your voice completely
- Use your signature phrases where appropriate
- Add your personality and perspective
- Keep the same approximate length
- Ensure it sounds natural and authentic to your character
- Preserve SEO keywords but make them flow naturally

Return ONLY the rewritten content, no explanations or meta-commentary.`;
}

/**
 * Generate prompt for voice consistency validation
 */
export function getVoiceValidationPrompt(writer: AIWriter, content: string): string {
  return `Analyze the following content to determine if it matches ${writer.name}'s voice and style.

WRITER PROFILE:
- Nationality: ${writer.nationality}
- Personality: ${writer.personality}
- Writing Style: ${writer.writingStyle}
- Key Characteristics: ${writer.voiceCharacteristics.join(', ')}
- Signature Phrases: ${writer.samplePhrases.join(', ')}

CONTENT TO ANALYZE:
${content}

Provide a voice consistency score from 0-100 and specific feedback on:
1. Voice authenticity (does it sound like this writer?)
2. Style consistency (matches the writing style?)
3. Use of signature elements (appropriate use of characteristic phrases?)
4. Areas that need adjustment to better match the voice

Format your response as JSON:
{
  "score": <number 0-100>,
  "voiceAuthenticity": "<analysis>",
  "styleConsistency": "<analysis>",
  "signatureElements": "<analysis>",
  "improvements": ["<suggestion 1>", "<suggestion 2>", ...]
}`;
}

/**
 * Generate prompt for SEO optimization while maintaining voice
 */
export function getSeoOptimizationPrompt(
  writer: AIWriter, 
  content: string, 
  keywords: string[]
): string {
  return `As ${writer.name}, optimize this content for SEO while maintaining your authentic voice.

TARGET KEYWORDS: ${keywords.join(', ')}

CURRENT CONTENT:
${content}

INSTRUCTIONS:
- Naturally incorporate target keywords where they fit
- Improve readability and structure
- Add semantic variations of keywords
- Ensure headers are clear and keyword-rich
- Keep your personality and voice intact
- Don't sacrifice naturalness for keyword density

Return the optimized content maintaining your unique ${writer.nationality} ${writer.personality} voice.`;
}

/**
 * Get writer-specific content guidelines
 */
export function getWriterGuidelines(writer: AIWriter): string[] {
  const baseGuidelines = [
    `Always write as ${writer.name} in first person`,
    `Expertise focus: ${writer.expertise.join(', ')}`,
    `Target content types: ${writer.contentTypes.join(', ')}`,
    `Primary languages: ${writer.languages.join(', ')}`
  ];

  // Add writer-specific guidelines
  const specificGuidelines: Record<string, string[]> = {
    "james-mitchell": [
      "Emphasize quality, service, and attention to detail",
      "Reference hotel industry standards and best practices",
      "Compare to international luxury properties when relevant"
    ],
    "sofia-reyes": [
      "Build excitement and FOMO (fear of missing out)",
      "Include social media appeal and photo opportunities",
      "Mention dress codes, entry requirements, and insider tips"
    ],
    "alexander-volkov": [
      "Describe flavors with precision and sophistication",
      "Reference culinary techniques and presentations",
      "Compare to international fine dining standards"
    ],
    "priya-sharma": [
      "Always include practical budget information",
      "Mention family-friendly facilities and considerations",
      "Provide time-saving tips and logistics help"
    ],
    "omar-al-rashid": [
      "Share cultural context and historical significance",
      "Explain local customs and etiquette",
      "Use Arabic terms with English translations"
    ],
    "elena-costa": [
      "Focus on holistic benefits and experiences",
      "Describe atmosphere and sensory details",
      "Mention wellness credentials and philosophies"
    ],
    "david-chen": [
      "Include relevant statistics and market data",
      "Analyze value propositions and ROI",
      "Consider business traveler needs"
    ],
    "layla-hassan": [
      "Emphasize the thrill and unique experiences",
      "Include safety information naturally",
      "Build anticipation and excitement"
    ],
    "marcus-weber": [
      "Highlight exclusivity and quality",
      "Reference current trends and collections",
      "Describe the shopping experience details"
    ],
    "aisha-patel": [
      "Focus on authentic, local experiences",
      "Describe flavors vividly and enthusiastically",
      "Include practical details like opening hours and prices"
    ]
  };

  return [
    ...baseGuidelines,
    ...(specificGuidelines[writer.id] || [])
  ];
}
