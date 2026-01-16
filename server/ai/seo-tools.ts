/**
 * AI SEO Analysis and Optimization Tools
 */

import { getAIClient, getModelForProvider } from "./providers";
import type { SeoScoreResult, SeoImprovementResult } from "./types";

/**
 * Analyze SEO score using AI
 */
export async function analyzeSeoScore(
  content: {
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    primaryKeyword?: string | null;
    secondaryKeywords?: string[] | null;
    blocks?: Array<{ type: string; data?: { content?: string; faqs?: Array<{ question: string; answer: string }>; tips?: string[] } }>;
    heroImageAlt?: string | null;
  }
): Promise<SeoScoreResult | null> {
  const aiClient = getAIClient();
  if (!aiClient) {
    console.warn("No AI provider configured for SEO analysis");
    return null;
  }
  const { client: openai, provider } = aiClient;

  try {
    const blocksText = content.blocks?.map(b => {
      if (b.type === 'text' && b.data?.content) return b.data.content;
      if (b.type === 'faq' && b.data?.faqs) {
        return b.data.faqs.map((f) => `${f.question} ${f.answer}`).join(' ');
      }
      if (b.type === 'tips' && b.data?.tips) return b.data.tips.join(' ');
      return '';
    }).join(' ') || '';

    const wordCount = blocksText.split(/\s+/).filter(Boolean).length;

    // SEO analysis uses standard model for cost savings
    const response = await openai.chat.completions.create({
      model: getModelForProvider(provider, "standard"),
      messages: [
        {
          role: "system",
          content: `You are an SEO expert analyzing travel content for optimization. Score content 0-100 based on:

1. Title Optimization (15 pts): Primary keyword in title, compelling, 50-60 chars
2. Meta Description (15 pts): Keyword included, compelling CTA, 150-160 chars
3. Keyword Usage (20 pts): Primary keyword density 1-2%, LSI keywords present, natural usage
4. Content Structure (20 pts): H2/H3 headings, FAQs present, clear sections, 1200+ words
5. Readability (15 pts): Short paragraphs, simple language, scannable
6. Internal Linking Potential (5 pts): Mentions related topics that could be linked
7. Image Optimization (10 pts): Alt text present and descriptive

Output valid JSON only with this structure:
{
  "score": 85,
  "breakdown": {
    "titleOptimization": 14,
    "metaDescription": 13,
    "keywordUsage": 18,
    "contentStructure": 19,
    "readability": 14,
    "internalLinking": 4,
    "imageOptimization": 9
  },
  "suggestions": ["3-5 specific, actionable improvements"],
  "passesThreshold": true
}`
        },
        {
          role: "user",
          content: `Analyze this content for SEO score:

TITLE: ${content.title}
META TITLE: ${content.metaTitle || 'Not set'}
META DESCRIPTION: ${content.metaDescription || 'Not set'}
PRIMARY KEYWORD: ${content.primaryKeyword || 'Not set'}
SECONDARY KEYWORDS: ${content.secondaryKeywords?.join(', ') || 'None'}
HERO IMAGE ALT: ${content.heroImageAlt || 'Not set'}
WORD COUNT: ${wordCount}

CONTENT PREVIEW (first 2000 chars):
${blocksText.substring(0, 2000)}

Score this content and provide breakdown. The threshold for passing is 90+.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      score: result.score || 0,
      breakdown: result.breakdown || {
        titleOptimization: 0,
        metaDescription: 0,
        keywordUsage: 0,
        contentStructure: 0,
        readability: 0,
        internalLinking: 0,
        imageOptimization: 0
      },
      suggestions: result.suggestions || [],
      passesThreshold: (result.score || 0) >= 90
    };
  } catch (error) {
    console.error("Error analyzing SEO score:", error);
    return null;
  }
}

/**
 * Improve content to meet SEO threshold
 */
export async function improveContentForSeo(
  content: {
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    primaryKeyword?: string | null;
    blocks?: Array<{ type: string; data?: unknown }>;
  },
  suggestions: string[]
): Promise<SeoImprovementResult | null> {
  const aiClient = getAIClient();
  if (!aiClient) return null;
  const { client: openai, provider } = aiClient;

  try {
    // SEO improvement uses standard model for cost savings
    const response = await openai.chat.completions.create({
      model: getModelForProvider(provider, "standard"),
      messages: [
        {
          role: "system",
          content: `You are an SEO content optimizer. Improve the provided content based on the suggestions to achieve a 90+ SEO score. Focus on:
- Optimizing meta title (50-60 chars, include primary keyword)
- Optimizing meta description (150-160 chars, include keyword and CTA)
- Improving keyword density in text blocks
- Enhancing readability

Output valid JSON with: metaTitle, metaDescription, improvedBlocks (only text/tips blocks that need changes)`
        },
        {
          role: "user",
          content: `Improve this content based on these suggestions:
${suggestions.join('\n')}

Current content:
TITLE: ${content.title}
META TITLE: ${content.metaTitle}
META DESCRIPTION: ${content.metaDescription}
PRIMARY KEYWORD: ${content.primaryKeyword}

BLOCKS TO IMPROVE:
${JSON.stringify(content.blocks?.filter(b => b.type === 'text' || b.type === 'tips'), null, 2)}

Return improved metaTitle, metaDescription, and only the blocks that need changes.`
        }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "null");
  } catch (error) {
    console.error("Error improving content for SEO:", error);
    return null;
  }
}
