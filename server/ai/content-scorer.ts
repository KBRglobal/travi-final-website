/**
 * AI Content Scorer
 *
 * Uses OpenAI GPT-4o-mini to analyze and score content quality
 * - Overall content quality
 * - Readability and structure
 * - SEO optimization
 * - Engagement potential
 * - Originality
 */

import OpenAI from "openai";
import { db } from "../db";
import { contentScores, contents } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface ContentAnalysis {
  overallScore: number; // 0-100
  readabilityScore: number; // 0-100
  seoScore: number; // 0-100
  engagementScore: number; // 0-100
  originalityScore: number; // 0-100
  structureScore: number; // 0-100
  feedback: string[];
  suggestions: string[];
  analysis: {
    strengths: string[];
    weaknesses: string[];
    keywords: string[];
    toneAnalysis: string;
  };
}

export const contentScorer = {
  /**
   * Analyze and score content using GPT-4o-mini
   */
  async scoreContent(contentId: string): Promise<ContentAnalysis | null> {
    try {
      if (!openai) {
        throw new Error("OpenAI API key not configured");
      }

      // Fetch content
      const contentData = await db
        .select()
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      if (contentData.length === 0) {
        throw new Error("Content not found");
      }

      const content = contentData[0];

      // Build content text from blocks
      let contentText = content.title + "\n\n";
      if (content.metaDescription) {
        contentText += content.metaDescription + "\n\n";
      }

      // Extract text from content blocks
      if (content.blocks && Array.isArray(content.blocks)) {
        for (const block of content.blocks as Array<{
          type: string;
          content?: string;
          text?: string;
        }>) {
          if (block.type === "paragraph" || block.type === "text") {
            contentText += (block.content || block.text || "") + "\n";
          } else if (block.type === "heading") {
            contentText += "\n" + (block.content || block.text || "") + "\n";
          }
        }
      }

      // Analyze with GPT-4o-mini
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a content quality analyzer for Dubai travel content. Analyze the given content and provide scores (0-100) for:
1. Overall Quality
2. Readability (clarity, sentence structure, flow)
3. SEO Optimization (keywords, meta info, structure)
4. Engagement Potential (hooks, storytelling, emotional appeal)
5. Originality (unique perspective, fresh information)
6. Structure (organization, headings, formatting)

Also provide:
- Specific feedback points (3-5 items)
- Actionable suggestions for improvement (3-5 items)
- Strengths and weaknesses
- Key keywords found
- Tone analysis

Respond in JSON format.`,
          },
          {
            role: "user",
            content: `Analyze this content:\n\nTitle: ${content.title}\nType: ${content.type}\nKeywords: ${content.primaryKeyword || "none"}\n\nContent:\n${contentText.substring(0, 4000)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const analysis = JSON.parse(response) as {
        overallScore: number;
        readabilityScore: number;
        seoScore: number;
        engagementScore: number;
        originalityScore: number;
        structureScore: number;
        feedback: string[];
        suggestions: string[];
        strengths: string[];
        weaknesses: string[];
        keywords: string[];
        toneAnalysis: string;
      };

      // Store scores in database
      await db.insert(contentScores).values({
        contentId,
        overallScore: analysis.overallScore,
        readabilityScore: analysis.readabilityScore,
        seoScore: analysis.seoScore,
        engagementScore: analysis.engagementScore,
        originalityScore: analysis.originalityScore,
        structureScore: analysis.structureScore,
        feedback: analysis.feedback || [],
        suggestions: analysis.suggestions || [],
        analysis: {
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          keywords: analysis.keywords || [],
          toneAnalysis: analysis.toneAnalysis || "",
        },
      });

      return {
        overallScore: analysis.overallScore,
        readabilityScore: analysis.readabilityScore,
        seoScore: analysis.seoScore,
        engagementScore: analysis.engagementScore,
        originalityScore: analysis.originalityScore,
        structureScore: analysis.structureScore,
        feedback: analysis.feedback || [],
        suggestions: analysis.suggestions || [],
        analysis: {
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          keywords: analysis.keywords || [],
          toneAnalysis: analysis.toneAnalysis || "",
        },
      };
    } catch (error) {
      return null;
    }
  },

  /**
   * Get latest score for content
   */
  async getContentScore(contentId: string): Promise<ContentAnalysis | null> {
    try {
      const scores = await db
        .select()
        .from(contentScores)
        .where(eq(contentScores.contentId, contentId))
        .orderBy(contentScores.createdAt)
        .limit(1);

      if (scores.length === 0) {
        return null;
      }

      const score = scores[0];
      return {
        overallScore: score.overallScore || 0,
        readabilityScore: score.readabilityScore || 0,
        seoScore: score.seoScore || 0,
        engagementScore: score.engagementScore || 0,
        originalityScore: score.originalityScore || 0,
        structureScore: score.structureScore || 0,
        feedback: (score.feedback as string[]) || [],
        suggestions: (score.suggestions as string[]) || [],
        analysis: (score.analysis as ContentAnalysis["analysis"]) || {
          strengths: [],
          weaknesses: [],
          keywords: [],
          toneAnalysis: "",
        },
      };
    } catch (error) {
      return null;
    }
  },
};
