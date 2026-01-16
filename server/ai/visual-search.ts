/**
 * Visual Search
 * 
 * Uses OpenAI Vision API to analyze images and find similar content
 * - Analyze image content
 * - Extract visual features
 * - Find similar images/content
 */

import OpenAI from "openai";
import { db } from "../db";
import { contents } from "@shared/schema";
import { like, or } from "drizzle-orm";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface ImageAnalysis {
  description: string;
  keywords: string[];
  landmarks: string[];
  colors: string[];
  mood: string;
  contentType: string;
  confidence: number;
}

export interface VisualSearchResult {
  contentId: string;
  title: string;
  imageUrl: string;
  relevanceScore: number;
  matchReason: string;
}

export const visualSearch = {
  /**
   * Analyze image using OpenAI Vision API
   */
  async analyzeImage(imageUrl: string): Promise<ImageAnalysis | null> {
    try {
      if (!openai) {
        throw new Error("OpenAI API key not configured");
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // OpenAI's GPT-4o mini model
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing travel and tourism images for Dubai. 
Analyze the image and provide:
1. A detailed description
2. Keywords (landmarks, activities, objects)
3. Any Dubai landmarks identified
4. Dominant colors
5. Overall mood/atmosphere
6. Content type (attraction, hotel, restaurant, activity, landscape, etc.)
7. Confidence score (0-100)

Respond in JSON format.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: "Analyze this image for Dubai travel content.",
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI Vision");
      }

      const analysis = JSON.parse(content) as {
        description: string;
        keywords: string[];
        landmarks: string[];
        colors: string[];
        mood: string;
        contentType: string;
        confidence: number;
      };

      return {
        description: analysis.description || '',
        keywords: analysis.keywords || [],
        landmarks: analysis.landmarks || [],
        colors: analysis.colors || [],
        mood: analysis.mood || '',
        contentType: analysis.contentType || 'unknown',
        confidence: analysis.confidence || 0,
      };
    } catch (error) {
      console.error("[Visual Search] Error analyzing image:", error);
      return null;
    }
  },

  /**
   * Search for content using image analysis
   */
  async searchByImage(imageUrl: string, limit: number = 10): Promise<VisualSearchResult[]> {
    try {
      // Analyze the image
      const analysis = await this.analyzeImage(imageUrl);
      if (!analysis) {
        return [];
      }

      // Build search query from analysis
      const searchTerms = [
        ...analysis.keywords,
        ...analysis.landmarks,
        analysis.contentType,
      ].filter(Boolean);

      if (searchTerms.length === 0) {
        return [];
      }

      // Search for matching content
      const conditions = searchTerms.map(term =>
        or(
          like(contents.title, `%${term}%`),
          like(contents.metaDescription, `%${term}%`)
        )
      );

      const matchingContent = await db
        .select()
        .from(contents)
        .where(or(...conditions))
        .limit(limit * 2); // Get more results to filter

      // Score and rank results
      const results: VisualSearchResult[] = matchingContent
        .map(content => {
          let score = 0;
          let matchReasons: string[] = [];

          // Score based on keyword matches
          const contentText = (content.title + ' ' + content.metaDescription).toLowerCase();
          
          searchTerms.forEach(term => {
            if (contentText.includes(term.toLowerCase())) {
              score += 10;
              matchReasons.push(term);
            }
          });

          // Bonus for landmark matches
          analysis.landmarks.forEach(landmark => {
            if (contentText.includes(landmark.toLowerCase())) {
              score += 20;
            }
          });

          // Bonus for content type match
          if (content.type === analysis.contentType) {
            score += 15;
          }

          return {
            contentId: content.id,
            title: content.title,
            imageUrl: content.heroImage || '',
            relevanceScore: score,
            matchReason: matchReasons.slice(0, 3).join(', '),
          };
        })
        .filter(result => result.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error("[Visual Search] Error searching by image:", error);
      return [];
    }
  },

  /**
   * Find similar images in content
   */
  async findSimilarImages(imageUrl: string, limit: number = 5): Promise<VisualSearchResult[]> {
    try {
      // Analyze the query image
      const analysis = await this.analyzeImage(imageUrl);
      if (!analysis) {
        return [];
      }

      // Get all content with images
      const allContent = await db
        .select()
        .from(contents)
        .limit(100); // Limit for performance

      const results: VisualSearchResult[] = [];

      for (const content of allContent) {
        if (!content.heroImage) continue;

        // Analyze content image
        const contentAnalysis = await this.analyzeImage(content.heroImage);
        if (!contentAnalysis) continue;

        // Calculate similarity score
        let score = 0;

        // Compare keywords
        const commonKeywords = analysis.keywords.filter(k =>
          contentAnalysis.keywords.includes(k)
        );
        score += commonKeywords.length * 10;

        // Compare landmarks
        const commonLandmarks = analysis.landmarks.filter(l =>
          contentAnalysis.landmarks.includes(l)
        );
        score += commonLandmarks.length * 20;

        // Compare content type
        if (analysis.contentType === contentAnalysis.contentType) {
          score += 15;
        }

        // Compare mood
        if (analysis.mood === contentAnalysis.mood) {
          score += 10;
        }

        // Compare colors
        const commonColors = analysis.colors.filter(c =>
          contentAnalysis.colors.includes(c)
        );
        score += commonColors.length * 5;

        if (score > 0) {
          results.push({
            contentId: content.id,
            title: content.title,
            imageUrl: content.heroImage,
            relevanceScore: score,
            matchReason: `${commonKeywords.length} common keywords, ${commonLandmarks.length} landmarks`,
          });
        }
      }

      // Sort by relevance and return top results
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error("[Visual Search] Error finding similar images:", error);
      return [];
    }
  },
};
