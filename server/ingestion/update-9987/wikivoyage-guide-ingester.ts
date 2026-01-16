/**
 * Update 9987 - Wikivoyage Guide Ingester
 * Fetches travel guides from Wikivoyage and rewrites them using cheap AI models
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987Guides, update9987Cities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { UPDATE_9987_CONFIG } from './index';

const WIKIVOYAGE_API = 'https://en.wikivoyage.org/w/api.php';

// Cost per 1M tokens (approximate)
const MODEL_COSTS = {
  'deepseek-chat': { input: 0.14, output: 0.28 }, // DeepSeek V3 - super cheap
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

interface IngestionError {
  message: string;
  data?: unknown;
}

export class WikivoyageGuideIngester extends BaseIngester {
  source: DataSource = {
    id: 'wikivoyage-guides',
    name: 'Wikivoyage Travel Guides',
    displayName: 'Wikivoyage Guides',
    description: 'Travel guides from Wikivoyage, rewritten for TRAVI',
    type: 'api',
    config: {
      enabled: true,
      retryAttempts: 3,
      batchSize: 10,
    },
  };

  private currentModel = UPDATE_9987_CONFIG.cheapModels.primary;
  private totalCost = 0;

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    let created = 0;
    let updated = 0;
    const errors: IngestionError[] = [];

    try {
      this.log('Starting Wikivoyage guide ingestion');

      // Get list of cities from our database to fetch guides for
      const cities = await db.select({ name: update9987Cities.name, countryCode: update9987Cities.countryCode })
        .from(update9987Cities)
        .limit(50);

      this.log(`Processing guides for ${cities.length} cities`);

      for (const city of cities) {
        try {
          // Check if guide already exists
          const existingGuide = await db.select()
            .from(update9987Guides)
            .where(eq(update9987Guides.slug, this.createSlug(city.name)))
            .limit(1);

          if (existingGuide.length > 0 && existingGuide[0].rewrittenContent) {
            this.log(`Skipping ${city.name} - already processed`);
            continue;
          }

          // Fetch guide from Wikivoyage
          const content = await this.fetchWikivoyageGuide(city.name);
          
          if (!content || content.length < 500) {
            this.log(`No substantial guide found for ${city.name}`);
            continue;
          }

          // Rewrite using cheap AI model
          const rewritten = await this.rewriteContent(city.name, content);

          if (!rewritten) {
            errors.push({
              message: 'Failed to rewrite content',
              data: { city: city.name },
            });
            continue;
          }

          // Save to database
          await db.insert(update9987Guides).values({
            title: `${city.name} Travel Guide`,
            slug: this.createSlug(city.name),
            destinationType: 'city',
            countryCode: city.countryCode,
            originalContent: content,
            rewrittenContent: rewritten.content,
            rewriteModel: rewritten.model,
            rewriteCost: rewritten.cost.toFixed(6),
            status: 'pending',
          }).onConflictDoUpdate({
            target: update9987Guides.slug,
            set: {
              originalContent: content,
              rewrittenContent: rewritten.content,
              rewriteModel: rewritten.model,
              rewriteCost: rewritten.cost.toFixed(6),
              updatedAt: new Date(),
            },
          });

          created++;
          this.totalCost += rewritten.cost;
          this.log(`Processed ${city.name} - Cost: $${rewritten.cost.toFixed(6)}`);

          // Rate limiting - be nice to Wikivoyage
          await this.sleep(1000);

        } catch (error) {
          errors.push({
            message: error instanceof Error ? error.message : String(error),
            data: { city: city.name },
          });
        }
      }

      this.log(`Ingestion completed. Total cost: $${this.totalCost.toFixed(4)}`);

      return this.createResult({
        recordsProcessed: cities.length,
        recordsCreated: created,
        recordsUpdated: updated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('Ingestion failed', error);
      errors.push({
        message: error instanceof Error ? error.message : String(error),
        data: { scope: 'GLOBAL' },
      });
      
      return this.createResult({
        recordsProcessed: 0,
        recordsCreated: created,
        recordsUpdated: updated,
        errors,
        durationMs: Date.now() - startTime,
      });
    }
  }

  private async fetchWikivoyageGuide(cityName: string): Promise<string | null> {
    try {
      // First, search for the page
      const searchUrl = `${WIKIVOYAGE_API}?action=query&format=json&list=search&srsearch=${encodeURIComponent(cityName)}&srlimit=1`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.query?.search?.length) {
        return null;
      }

      const pageTitle = searchData.query.search[0].title;

      // Fetch the page content
      const contentUrl = `${WIKIVOYAGE_API}?action=query&format=json&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(pageTitle)}`;
      const contentResponse = await fetch(contentUrl);
      const contentData = await contentResponse.json();

      const pages = contentData.query?.pages;
      if (!pages) return null;

      const pageId = Object.keys(pages)[0];
      return pages[pageId]?.extract || null;
    } catch (error) {
      this.logError(`Failed to fetch Wikivoyage guide for ${cityName}`, error);
      return null;
    }
  }

  private async rewriteContent(cityName: string, originalContent: string): Promise<{ content: string; model: string; cost: number } | null> {
    const models = [
      UPDATE_9987_CONFIG.cheapModels.primary,
      UPDATE_9987_CONFIG.cheapModels.fallback,
      UPDATE_9987_CONFIG.cheapModels.budget,
    ];

    // Truncate to first 4000 chars to save costs
    const truncatedContent = originalContent.slice(0, 4000);
    
    const prompt = `You are a travel content writer for TRAVI, a modern travel platform. Rewrite this Wikivoyage guide for ${cityName} in a fresh, engaging voice while preserving all factual information.

Guidelines:
- Use a conversational, friendly tone
- Keep all facts, addresses, prices, and practical info intact
- Add personality but stay informative
- Use "you" to address the reader directly
- Keep similar length to original
- NO emojis, NO markdown formatting

Original content:
${truncatedContent}

Rewritten version:`;

    for (const model of models) {
      try {
        const response = await this.callCheapModel(model, prompt);
        if (response) {
          const inputTokens = prompt.length / 4; // rough estimate
          const outputTokens = response.length / 4;
          const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || MODEL_COSTS['deepseek-chat'];
          const cost = (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;

          return { content: response, model, cost };
        }
      } catch (error) {
        this.log(`Model ${model} failed, trying fallback...`);
      }
    }

    return null;
  }

  private async callCheapModel(model: string, prompt: string): Promise<string | null> {
    try {
      // Use OpenRouter for DeepSeek and other cheap models
      const openrouterKey = process.env.OPENROUTER_NEVO_KEY;
      if (!openrouterKey) {
        this.logError('OPENROUTER_NEVO_KEY not set');
        return null;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model === 'deepseek-chat' ? 'deepseek/deepseek-chat' : 
                 model === 'gemini-1.5-flash' ? 'google/gemini-flash-1.5' :
                 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      this.logError(`Failed to call ${model}`, error);
      return null;
    }
  }

  private createSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  validate(data: unknown): boolean {
    return typeof data === 'string' && data.length > 0;
  }

  transform(data: unknown): unknown {
    return data;
  }
}
