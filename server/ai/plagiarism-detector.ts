/**
 * Plagiarism Detector
 * 
 * Uses OpenAI embeddings to detect content similarity
 * - Generate embeddings for content
 * - Compare similarity scores
 * - Detect potential plagiarism
 * 
 * Security: Uses ReDoS-safe regex pattern for sentence splitting
 * Changed from /[^.!?]+[.!?]+/g to /[^.!?\r\n]{1,1000}[.!?]+/g
 */

import OpenAI from "openai";
import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, ne } from "drizzle-orm";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface SimilarityResult {
  contentId: string;
  title: string;
  similarity: number; // 0-1
  matchedSentences: Array<{
    original: string;
    similar: string;
    score: number;
  }>;
}

export interface PlagiarismCheckResult {
  isPlagiarized: boolean;
  overallSimilarity: number;
  similarContent: SimilarityResult[];
  checkedAgainst: number;
}

// Security: ReDoS-safe sentence splitting regex
// Limits each capture to 1-1000 characters to prevent catastrophic backtracking
const SENTENCE_REGEX = /[^.!?\r\n]{1,1000}[.!?]+/g;

export const plagiarismDetector = {
  /**
   * Split text into sentences using ReDoS-safe regex
   */
  splitIntoSentences(text: string): string[] {
    const sentences = text.match(SENTENCE_REGEX);
    return sentences ? sentences.map(s => s.trim()).filter(s => s.length > 20) : [];
  },

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      if (!openai) {
        throw new Error("OpenAI API key not configured");
      }

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // Limit input length
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("[Plagiarism] Error generating embedding:", error);
      return null;
    }
  },

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embeddings must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  /**
   * Check content for plagiarism against existing content
   */
  async checkPlagiarism(
    contentId: string,
    threshold: number = 0.85
  ): Promise<PlagiarismCheckResult> {
    try {
      if (!openai) {
        throw new Error("OpenAI API key not configured");
      }

      // Fetch target content
      const targetContent = await db
        .select()
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      if (targetContent.length === 0) {
        throw new Error("Content not found");
      }

      const content = targetContent[0];

      // Extract text from content
      let contentText = content.title + "\n";
      if (content.blocks && Array.isArray(content.blocks)) {
        for (const block of content.blocks as Array<{ type: string; content?: string; text?: string }>) {
          if (block.type === 'paragraph' || block.type === 'text') {
            contentText += (block.content || block.text || '') + "\n";
          }
        }
      }

      // Split into sentences
      const sentences = this.splitIntoSentences(contentText);

      if (sentences.length === 0) {
        return {
          isPlagiarized: false,
          overallSimilarity: 0,
          similarContent: [],
          checkedAgainst: 0,
        };
      }

      // Generate embeddings for sentences
      const sentenceEmbeddings = await Promise.all(
        sentences.slice(0, 10).map(s => this.generateEmbedding(s)) // Limit to first 10 sentences
      );

      // Fetch other published content
      const otherContent = await db
        .select()
        .from(contents)
        .where(ne(contents.id, contentId))
        .limit(50); // Check against 50 most recent items

      const similarContent: SimilarityResult[] = [];

      // Check each content item
      for (const other of otherContent) {
        let otherText = other.title + "\n";
        if (other.blocks && Array.isArray(other.blocks)) {
          for (const block of other.blocks as Array<{ type: string; content?: string; text?: string }>) {
            if (block.type === 'paragraph' || block.type === 'text') {
              otherText += (block.content || block.text || '') + "\n";
            }
          }
        }

        const otherSentences = this.splitIntoSentences(otherText);
        const otherEmbeddings = await Promise.all(
          otherSentences.slice(0, 10).map(s => this.generateEmbedding(s))
        );

        const matchedSentences: SimilarityResult['matchedSentences'] = [];
        let totalSimilarity = 0;
        let comparisons = 0;

        // Compare embeddings
        for (let i = 0; i < sentenceEmbeddings.length; i++) {
          const embedding1 = sentenceEmbeddings[i];
          if (!embedding1) continue;

          for (let j = 0; j < otherEmbeddings.length; j++) {
            const embedding2 = otherEmbeddings[j];
            if (!embedding2) continue;

            const similarity = this.cosineSimilarity(embedding1, embedding2);
            totalSimilarity += similarity;
            comparisons++;

            if (similarity >= threshold) {
              matchedSentences.push({
                original: sentences[i],
                similar: otherSentences[j],
                score: similarity,
              });
            }
          }
        }

        const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

        if (avgSimilarity >= threshold * 0.7 || matchedSentences.length > 0) {
          similarContent.push({
            contentId: other.id,
            title: other.title,
            similarity: avgSimilarity,
            matchedSentences: matchedSentences.slice(0, 5), // Top 5 matches
          });
        }
      }

      // Sort by similarity
      similarContent.sort((a, b) => b.similarity - a.similarity);

      const overallSimilarity = similarContent.length > 0
        ? similarContent[0].similarity
        : 0;

      return {
        isPlagiarized: overallSimilarity >= threshold,
        overallSimilarity,
        similarContent: similarContent.slice(0, 5), // Top 5 similar items
        checkedAgainst: otherContent.length,
      };
    } catch (error) {
      console.error("[Plagiarism] Error checking plagiarism:", error);
      return {
        isPlagiarized: false,
        overallSimilarity: 0,
        similarContent: [],
        checkedAgainst: 0,
      };
    }
  },

  /**
   * Quick similarity check between two text strings
   */
  async compareTexts(text1: string, text2: string): Promise<number> {
    try {
      const embedding1 = await this.generateEmbedding(text1);
      const embedding2 = await this.generateEmbedding(text2);

      if (!embedding1 || !embedding2) {
        return 0;
      }

      return this.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      console.error("[Plagiarism] Error comparing texts:", error);
      return 0;
    }
  },
};
