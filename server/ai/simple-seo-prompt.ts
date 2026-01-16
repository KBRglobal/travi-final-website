/**
 * Simple SEO/AEO Content Prompt
 * Clean, minimal guidelines for content generation
 */

export const SIMPLE_SEO_PROMPT = `
Create content following SEO and AEO best practices:

STRUCTURE:
- Clear, informative headline that answers a search query
- Logical heading structure (H2, H3) for scannability
- Answer user intent directly in the first paragraph
- Natural paragraph flow with 2-4 sentences each

QUALITY:
- Write for humans first, search engines second
- Conversational tone suitable for voice search (AEO)
- Factual, helpful, original information
- No fluff or filler content

LINKS:
- Include relevant internal links to related content
- Add 2-3 authoritative external sources where helpful

KEYWORDS:
- Use keywords naturally (no stuffing)
- Include semantic variations
- Focus on topic coverage over exact matches

AVOID:
- Clickbait phrases and excessive superlatives
- Repetitive keyword usage
- Generic introductions
- Padding for word count
`;

export function getSimpleSeoPrompt(topic: string, contentType: string): string {
  return `${SIMPLE_SEO_PROMPT}

Topic: ${topic}
Content Type: ${contentType}

Generate helpful, well-structured content that answers what users want to know about this topic.`;
}
