/**
 * AI Content Helpers
 *
 * Utilities for AI-generated article content: word counting, content expansion,
 * and the shape interface for generated articles.
 */

import type OpenAI from "openai";
import { safeParseJson } from "./json-utils";
import { addSystemLog } from "./ai-logging";

/** Shape of AI-generated article JSON (parsed from provider responses) */
export interface GeneratedArticleShape {
  article?: {
    intro?: string;
    sections?: Array<{ heading: string; body: string }>;
    proTips?: string[];
    goodToKnow?: string[];
    faq?: Array<{ q: string; a: string }>;
    closing?: string;
  };
  meta?: {
    keywords?: string[];
    [key: string]: unknown;
  };
  analysis?: {
    category?: string;
    [key: string]: unknown;
  };
  suggestions?: Record<string, unknown>;
  _generationStats?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Count the number of words in a text string.
 *
 * @param text - Input text
 * @returns Word count
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

/**
 * Sum word counts across an array of items.
 * When `field` is provided, extracts that named property from each record;
 * otherwise treats each item as a plain string.
 *
 * @param items - Array of records or strings
 * @param field - Optional field name to extract from each record
 */
export function sumWords(
  items: Array<Record<string, string>> | string[] | undefined,
  field?: string
): number {
  return (items || []).reduce(
    (sum: number, item: Record<string, string> | string) =>
      sum +
      countWords(field ? (item as Record<string, string>)[field] || "" : (item as string) || ""),
    0
  );
}

/**
 * Calculate the total word count of a generated article across all content sections.
 *
 * @param article - The generated article shape
 * @returns Total word count
 */
export function getArticleWordCount(article: GeneratedArticleShape): number {
  const a = article.article;
  if (!a) return 0;
  return (
    countWords(a.intro || "") +
    sumWords(a.sections as Array<Record<string, string>> | undefined, "body") +
    sumWords(a.proTips) +
    sumWords(a.goodToKnow) +
    sumWords(a.faq?.map(f => f.a)) +
    countWords(a.closing || "")
  );
}

/**
 * Expand article content by requesting additional sections from the AI provider
 * until the word count minimum is met or maximum attempts are exhausted.
 *
 * @param generatedArticle - The article to expand (mutated in place)
 * @param articleTitle      - Title used in expansion prompts
 * @param openai            - OpenAI-compatible client
 * @param model             - Model identifier
 * @param provider          - Provider name (used for response_format selection)
 * @param getWordCount      - Word count calculator function
 * @returns Final word count and number of expansion attempts
 */
export async function expandArticleContent(
  generatedArticle: GeneratedArticleShape,
  articleTitle: string,
  openai: OpenAI,
  model: string,
  provider: string,
  getWordCount: (article: GeneratedArticleShape) => number
): Promise<{ wordCount: number; attempts: number }> {
  const MIN_WORD_TARGET = 1800;
  const MAX_EXPANSION_ATTEMPTS = 3;
  let wordCount = getWordCount(generatedArticle);
  let attempts = 0;

  addSystemLog("info", "ai", `Initial generation: ${wordCount} words`, { title: articleTitle });

  while (wordCount < MIN_WORD_TARGET && attempts < MAX_EXPANSION_ATTEMPTS) {
    attempts++;
    const wordsNeeded = MIN_WORD_TARGET - wordCount;
    addSystemLog(
      "info",
      "ai",
      `Expanding content: attempt ${attempts}, need ${wordsNeeded} more words`
    );

    const expansionPrompt = `The article below has only ${wordCount} words but needs at least ${MIN_WORD_TARGET} words.

Current sections: ${generatedArticle.article?.sections?.map(s => s.heading).join(", ") || "none"}

Please generate ${Math.max(3, Math.ceil(wordsNeeded / 200))} additional sections to expand this article about "${articleTitle}".
Each section should have 250-400 words of detailed, valuable content.

IMPORTANT: Generate NEW, UNIQUE sections that add value - do NOT repeat existing content.
Focus on practical tips, insider information, comparisons, or detailed guides.

Return JSON only:
{
  "additionalSections": [
    {"heading": "H2 Section Title", "body": "Detailed paragraph content 250-400 words..."}
  ],
  "additionalFaqs": [
    {"q": "Relevant question?", "a": "Detailed answer 80-120 words..."}
  ]
}`;

    try {
      const expansionResponse = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert Dubai travel content writer. Generate high-quality expansion content to meet word count requirements.",
          },
          { role: "user", content: expansionPrompt },
        ],
        ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
        max_tokens: 4000,
      });

      const expansion = safeParseJson(expansionResponse.choices[0].message.content || "{}", {});

      const additionalSections = expansion.additionalSections as
        | Array<{ heading: string; body: string }>
        | undefined;
      const additionalFaqs = expansion.additionalFaqs as
        | Array<{ q: string; a: string }>
        | undefined;

      if (additionalSections && generatedArticle.article?.sections) {
        generatedArticle.article.sections = [
          ...generatedArticle.article.sections,
          ...additionalSections,
        ];
      }
      if (additionalFaqs && generatedArticle.article?.faq) {
        generatedArticle.article.faq = [...generatedArticle.article.faq, ...additionalFaqs];
      }

      wordCount = getWordCount(generatedArticle);
      addSystemLog("info", "ai", `After expansion ${attempts}: ${wordCount} words`);
    } catch {
      break;
    }
  }

  if (wordCount < MIN_WORD_TARGET) {
    addSystemLog(
      "warning",
      "ai",
      `Article generated with only ${wordCount} words (minimum: ${MIN_WORD_TARGET})`,
      { title: articleTitle }
    );
  } else {
    addSystemLog("info", "ai", `Article meets word count requirement: ${wordCount} words`, {
      title: articleTitle,
    });
  }

  return { wordCount, attempts };
}
