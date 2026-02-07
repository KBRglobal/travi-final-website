/**
 * Embedding Generator
 *
 * Creates vector embeddings for content and queries
 * using OpenAI text-embedding-3-small ($0.02 per 1M tokens)
 */

import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  vector: number[];
  tokens: number;
  model: string;
}

export const embeddings = {
  /**
   * Generate embedding for text
   */
  async generate(text: string): Promise<EmbeddingResult> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Max ~8K tokens
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return {
      vector: response.data[0].embedding,
      tokens: response.usage.total_tokens,
      model: EMBEDDING_MODEL,
    };
  },

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const results: EmbeddingResult[] = [];

    // Process in batches of 100 (API limit)
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100).map(t => t.slice(0, 8000));

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      results.push(
        ...response.data.map((d, idx) => ({
          vector: d.embedding,
          tokens: Math.ceil(response.usage.total_tokens / batch.length),
          model: EMBEDDING_MODEL,
        }))
      );
    }

    return results;
  },

  /**
   * Create searchable text from content for embedding
   */
  createEmbeddingText(content: {
    title: string;
    type: string;
    metaDescription?: string;
    blocks?: any[];
    tags?: string[];
  }): string {
    const parts = [
      `${content.type}: ${content.title}`,
      content.metaDescription || "",
      content.tags?.join(", ") || "",
      extractPlainText(content.blocks || []).slice(0, 1000),
    ];
    return parts.filter(Boolean).join(". ");
  },
};

function extractPlainText(blocks: any[]): string {
  return blocks
    .map(block => {
      if (block.type === "text" || block.type === "paragraph") {
        return block.data?.content || block.data?.text || "";
      }
      if (block.type === "hero") {
        return block.data?.title || "";
      }
      return "";
    })
    .join(" ")
    .replaceAll(/<[^>]*>/g, "") // Strip HTML
    .replaceAll(/\s+/g, " ")
    .trim();
}
