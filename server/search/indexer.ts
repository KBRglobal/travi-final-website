/**
 * Search Indexer
 *
 * Indexes content for full-text and semantic search
 */

import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { contents, searchIndex } from "@shared/schema";
import { embeddings } from "./embeddings";

export const searchIndexer = {
  /**
   * Generate proper URL for content type
   */
  getContentUrl(type: string, slug: string): string {
    // Map content types to their URL paths
    const urlMap: Record<string, string> = {
      attraction: "/attractions/",
      hotel: "/hotels/",
      article: "/articles/",
      dining: "/dining/",
      district: "/districts/",
      transport: "/transport/",
      event: "/events/",
      itinerary: "/itineraries/",
      landing_page: "/landing-pages/",
      case_study: "/case-studies/",
      off_plan: "/off-plan/",
    };

    return (urlMap[type] || `/${type}s/`) + slug;
  },

  /**
   * Index a single content item with embedding generation
   */
  async indexContent(contentId: string): Promise<void> {
    // Fetch content
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

    if (!content || content.status !== "published") {
      return;
    }

    // Build searchable text
    const searchableText = this.buildSearchableText(content);

    // Generate embedding for semantic search
    let embeddingVector: string | null = null;
    try {
      const embeddingText = embeddings.createEmbeddingText({
        title: content.title,
        type: content.type,
        metaDescription: content.metaDescription || undefined,
        blocks: content.blocks as any[],
      });

      const result = await embeddings.generate(embeddingText);
      embeddingVector = `[${result.vector.join(",")}]`;
    } catch (error) {
      console.error(error);
    }

    // Upsert to search index
    await db.execute(sql`
      INSERT INTO search_index (
        content_id, title, content_type, meta_description, 
        searchable_text, url, image, locale, tags, embedding, updated_at
      )
      VALUES (
        ${contentId},
        ${content.title},
        ${content.type},
        ${content.metaDescription || null},
        ${searchableText},
        ${this.getContentUrl(content.type, content.slug)},
        ${content.heroImage || null},
        ${"en"},
        ${null},
        ${embeddingVector},
        NOW()
      )
      ON CONFLICT (content_id) 
      DO UPDATE SET
        title = EXCLUDED.title,
        content_type = EXCLUDED.content_type,
        meta_description = EXCLUDED.meta_description,
        searchable_text = EXCLUDED.searchable_text,
        url = EXCLUDED.url,
        image = EXCLUDED.image,
        locale = EXCLUDED.locale,
        tags = EXCLUDED.tags,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
    `);
  },

  /**
   * Remove content from search index
   */
  async removeContent(contentId: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM search_index WHERE content_id = ${contentId}
    `);
  },

  /**
   * Reindex all published content
   */
  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    const allContent = await db.select().from(contents).where(eq(contents.status, "published"));

    let indexed = 0;
    let errors = 0;

    for (const content of allContent) {
      try {
        await this.indexContent(content.id);
        indexed++;
      } catch (error) {
        console.error(error);
        errors++;
      }
    }

    return { indexed, errors };
  },

  /**
   * Build searchable text from content blocks
   */
  buildSearchableText(content: any): string {
    const parts: string[] = [content.title, content.metaDescription || ""];

    if (Array.isArray(content.blocks)) {
      const blockText = this.extractBlockText(content.blocks);
      parts.push(blockText);
    }

    if (Array.isArray(content.tags)) {
      parts.push(content.tags.join(" "));
    }

    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 5000); // Limit to reasonable size
  },

  /**
   * Extract plain text from content blocks
   */
  extractBlockText(blocks: any[]): string {
    return blocks
      .map(block => {
        if (block.type === "text" || block.type === "paragraph") {
          return block.data?.content || block.data?.text || "";
        }
        if (block.type === "hero") {
          return block.data?.title || "";
        }
        if (block.type === "heading") {
          return block.data?.text || "";
        }
        if (block.type === "list") {
          return block.data?.items?.join(" ") || "";
        }
        return "";
      })
      .join(" ")
      .replace(/<[^>]*>/g, "") // Strip HTML
      .replace(/\s+/g, " ")
      .trim();
  },
};
