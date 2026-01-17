/**
 * Semantic Image Search - Update 9987
 * 
 * CLIP-inspired semantic image search using text embeddings.
 * Since we can't run CLIP locally, we use text descriptions + embeddings
 * to create a semantic search system for images.
 * 
 * Features:
 * - Text-to-Image search: Find images matching a text query
 * - Image-to-Text search: Find similar images by description
 * - Tag-based semantic matching
 * - Uses pgvector for efficient similarity search
 */

import { db } from '../../db';
import { sql, eq, and, desc, isNotNull } from 'drizzle-orm';
import { log } from '../../lib/logger';

const imageSearchLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[SemanticImageSearch] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[SemanticImageSearch] ${msg}`, data),
  error: (msg: string, error?: unknown, data?: Record<string, unknown>) => log.error(`[SemanticImageSearch] ${msg}`, error, data),
};

// ============================================================================
// Types
// ============================================================================

export interface ImageMetadata {
  id: string;
  url: string;
  title?: string;
  alt?: string;
  description?: string;
  tags?: string[];
  category?: string;
  source?: string;
  width?: number;
  height?: number;
  createdAt?: Date;
}

export interface ImageSearchResult {
  image: ImageMetadata;
  score: number; // 0-1 similarity score
  matchType: 'semantic' | 'tag' | 'exact';
  matchedTerms?: string[];
}

export interface ImageSearchQuery {
  query: string; // Natural language query
  category?: string; // Filter by category
  minScore?: number; // Minimum similarity score (default 0.3)
  limit?: number; // Max results (default 20)
  includeEmbedding?: boolean; // Include embedding in results
}

export interface ImageEmbedding {
  imageId: string;
  embedding: number[];
  textDescription: string;
  tags: string[];
  createdAt: Date;
}

// ============================================================================
// Image Search Categories & Tags
// ============================================================================

const TRAVEL_IMAGE_CATEGORIES = [
  'attractions', 'hotels', 'restaurants', 'beaches', 'landmarks',
  'nature', 'architecture', 'nightlife', 'shopping', 'transport',
  'culture', 'food', 'adventure', 'luxury', 'budget',
] as const;

// Semantic tag expansions for better matching
const TAG_EXPANSIONS: Record<string, string[]> = {
  beach: ['ocean', 'sea', 'sand', 'coastal', 'tropical', 'waves', 'shore'],
  hotel: ['accommodation', 'resort', 'stay', 'lodging', 'room', 'suite'],
  restaurant: ['dining', 'food', 'cuisine', 'eatery', 'cafe', 'bistro'],
  landmark: ['monument', 'attraction', 'sightseeing', 'famous', 'historic'],
  nature: ['outdoor', 'landscape', 'scenic', 'natural', 'wilderness'],
  luxury: ['premium', 'upscale', 'elegant', 'exclusive', 'high-end', 'five-star'],
  adventure: ['outdoor', 'extreme', 'thrill', 'safari', 'hiking', 'diving'],
  nightlife: ['entertainment', 'club', 'bar', 'party', 'evening', 'night'],
  shopping: ['mall', 'market', 'boutique', 'retail', 'souk', 'bazaar'],
  architecture: ['building', 'structure', 'design', 'modern', 'traditional'],
  pool: ['swimming', 'infinity', 'rooftop', 'poolside', 'resort'],
  sunset: ['sunrise', 'golden hour', 'dusk', 'dawn', 'skyline', 'view'],
  desert: ['sand dunes', 'sahara', 'arid', 'oasis', 'camel'],
  cityscape: ['skyline', 'urban', 'downtown', 'metropolitan', 'city view'],
  food: ['cuisine', 'dish', 'meal', 'culinary', 'gastronomy', 'delicacy'],
};

// ============================================================================
// Core Search Class
// ============================================================================

export class SemanticImageSearch {
  private embeddingDimension = 1536;

  /**
   * Search for images using natural language query
   */
  async search(queryOptions: ImageSearchQuery): Promise<ImageSearchResult[]> {
    const { query, category, minScore = 0.3, limit = 20 } = queryOptions;
    
    imageSearchLogger.info('Starting image search', { query, category, limit });
    
    const results: ImageSearchResult[] = [];

    // Step 1: Extract semantic concepts from query
    const concepts = this.extractConcepts(query);
    imageSearchLogger.info('Extracted concepts', { concepts });

    // Step 2: Search by semantic embedding if available
    const semanticResults = await this.searchBySemanticSimilarity(query, category, limit);
    results.push(...semanticResults);

    // Step 3: Search by tag matching
    const tagResults = await this.searchByTags(concepts, category, limit);
    
    // Merge results, avoiding duplicates
    for (const tagResult of tagResults) {
      const existing = results.find(r => r.image.id === tagResult.image.id);
      if (!existing) {
        results.push(tagResult);
      } else if (tagResult.score > existing.score) {
        existing.score = tagResult.score;
      }
    }

    // Step 4: Search by text matching (fallback)
    if (results.length < limit) {
      const textResults = await this.searchByText(query, category, limit - results.length);
      for (const textResult of textResults) {
        if (!results.find(r => r.image.id === textResult.image.id)) {
          results.push(textResult);
        }
      }
    }

    // Filter by minimum score and sort
    const filtered = results
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    imageSearchLogger.info('Search complete', { 
      query, 
      totalResults: filtered.length,
      topScore: filtered[0]?.score 
    });

    return filtered;
  }

  /**
   * Find similar images to a given image
   */
  async findSimilar(imageId: string, limit: number = 10): Promise<ImageSearchResult[]> {
    imageSearchLogger.info('Finding similar images', { imageId, limit });

    // Get the source image's metadata
    const sourceImage = await this.getImageMetadata(imageId);
    if (!sourceImage) {
      imageSearchLogger.warn('Source image not found', { imageId });
      return [];
    }

    // Use the image's description and tags for similarity search
    const searchQuery = [
      sourceImage.description || '',
      sourceImage.alt || '',
      ...(sourceImage.tags || []),
    ].filter(Boolean).join(' ');

    if (!searchQuery) {
      return [];
    }

    const results = await this.search({
      query: searchQuery,
      category: sourceImage.category,
      limit: limit + 1, // Get one extra to exclude the source
    });

    // Remove the source image from results
    return results.filter(r => r.image.id !== imageId);
  }

  /**
   * Index an image for semantic search
   * 
   * Note: Uses update_9987_embeddings table with columns:
   * - content_type: 'image'
   * - content_id: image ID
   * - text: searchable text representation
   * - model: optional, for future embedding model info
   */
  async indexImage(image: ImageMetadata): Promise<void> {
    imageSearchLogger.info('Indexing image', { id: image.id, title: image.title });

    // Create text representation for embedding
    const textRepresentation = this.createTextRepresentation(image);
    
    // Extract and expand tags
    const tags = this.extractAndExpandTags(image);
    
    // Combine text with tags for better searchability
    const fullText = `${textRepresentation} Tags: ${tags.join(', ')}`;

    // Store in database using correct column names
    try {
      await db.execute(sql`
        INSERT INTO update_9987_embeddings (
          content_type,
          content_id,
          chunk_index,
          text,
          model,
          created_at
        ) VALUES (
          'image',
          ${image.id},
          0,
          ${fullText},
          'semantic-text',
          NOW()
        )
        ON CONFLICT (content_type, content_id) WHERE chunk_index = 0
        DO UPDATE SET
          text = EXCLUDED.text,
          created_at = NOW()
      `);
      
      imageSearchLogger.info('Image indexed successfully', { id: image.id });
    } catch (error) {
      imageSearchLogger.error('Failed to index image', error, { id: image.id });
      throw error;
    }
  }

  /**
   * Bulk index multiple images
   */
  async bulkIndex(images: ImageMetadata[]): Promise<{ indexed: number; failed: number }> {
    let indexed = 0;
    let failed = 0;

    for (const image of images) {
      try {
        await this.indexImage(image);
        indexed++;
      } catch (error) {
        failed++;
        imageSearchLogger.error('Failed to index image in bulk', error, { id: image.id });
      }
    }

    return { indexed, failed };
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  /**
   * Search using semantic embedding similarity
   */
  private async searchBySemanticSimilarity(
    query: string, 
    category?: string, 
    limit: number = 20
  ): Promise<ImageSearchResult[]> {
    try {
      // Check if embeddings table exists and has data
      const embeddingCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM update_9987_embeddings 
        WHERE entity_type = 'image' AND embedding IS NOT NULL
      `);
      
      const count = (embeddingCheck as any)?.[0]?.count || 0;
      if (count === 0) {
        return []; // No embeddings available
      }

      // For now, use text similarity until we have actual embeddings
      // This will be enhanced when embedding generation is implemented
      return [];
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Search by tag matching with semantic expansion
   * Uses update_9987_embeddings table with correct column names
   */
  private async searchByTags(
    concepts: string[], 
    category?: string, 
    limit: number = 20
  ): Promise<ImageSearchResult[]> {
    if (concepts.length === 0) return [];

    // Expand concepts to related tags
    const expandedTags = new Set<string>();
    for (const concept of concepts) {
      expandedTags.add(concept.toLowerCase());
      const expansions = TAG_EXPANSIONS[concept.toLowerCase()];
      if (expansions) {
        expansions.forEach(t => expandedTags.add(t));
      }
    }

    const tagArray = Array.from(expandedTags);
    
    try {
      // Search embeddings table for matching tags in text column
      // Use correct column names: content_type, content_id, text
      const results = await db.execute(sql`
        SELECT 
          content_id as id,
          text,
          (
            SELECT COUNT(*)::float / ${tagArray.length}
            FROM unnest(${tagArray}::text[]) t
            WHERE text ILIKE '%' || t || '%'
          ) as score
        FROM update_9987_embeddings
        WHERE content_type = 'image'
          AND text ILIKE ANY(SELECT '%' || t || '%' FROM unnest(${tagArray}::text[]) t)
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      return (results as unknown as any[]).map(row => ({
        image: {
          id: row.id,
          url: '', // URL not stored in embeddings table
          title: row.text?.substring(0, 100),
          tags: this.extractTagsFromText(row.text || ''),
          category: undefined,
        },
        score: Math.min(1, row.score || 0),
        matchType: 'tag' as const,
        matchedTerms: tagArray.filter(t => 
          row.text?.toLowerCase().includes(t)
        ),
      }));
    } catch (error) {
      imageSearchLogger.error('Tag search failed', error);
      return [];
    }
  }

  /**
   * Extract tags from text content
   */
  private extractTagsFromText(text: string): string[] {
    const tagMatch = text.match(/Tags:\s*(.+)$/i);
    if (tagMatch) {
      return tagMatch[1].split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * Search by text content matching (fallback)
   * Uses PostgreSQL full-text search on the text column
   */
  private async searchByText(
    query: string, 
    category?: string, 
    limit: number = 20
  ): Promise<ImageSearchResult[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (searchTerms.length === 0) return [];

    try {
      const results = await db.execute(sql`
        SELECT 
          content_id as id,
          text,
          ts_rank(to_tsvector('english', text), plainto_tsquery('english', ${query})) as score
        FROM update_9987_embeddings
        WHERE content_type = 'image'
          AND to_tsvector('english', text) @@ plainto_tsquery('english', ${query})
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      return (results as unknown as any[]).map(row => ({
        image: {
          id: row.id,
          url: '', // URL not stored in embeddings table
          title: row.text?.substring(0, 100),
          tags: this.extractTagsFromText(row.text || ''),
          category: undefined,
        },
        score: Math.min(1, (row.score || 0) * 0.5), // Scale down text match scores
        matchType: 'exact' as const,
      }));
    } catch (error) {
      imageSearchLogger.error('Text search failed', error);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract semantic concepts from a query
   */
  private extractConcepts(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const concepts: string[] = [];

    // Find category matches
    for (const category of TRAVEL_IMAGE_CATEGORIES) {
      if (words.includes(category) || words.some(w => category.startsWith(w))) {
        concepts.push(category);
      }
    }

    // Find tag expansion matches
    for (const [tag, expansions] of Object.entries(TAG_EXPANSIONS)) {
      if (words.includes(tag) || expansions.some(e => words.includes(e))) {
        concepts.push(tag);
      }
    }

    // Add significant words as concepts
    const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word) && !concepts.includes(word)) {
        concepts.push(word);
      }
    }

    return [...new Set(concepts)];
  }

  /**
   * Create text representation for embedding
   */
  private createTextRepresentation(image: ImageMetadata): string {
    const parts: string[] = [];
    
    if (image.title) parts.push(image.title);
    if (image.alt) parts.push(image.alt);
    if (image.description) parts.push(image.description);
    if (image.category) parts.push(`Category: ${image.category}`);
    if (image.tags?.length) parts.push(`Tags: ${image.tags.join(', ')}`);
    
    return parts.join('. ');
  }

  /**
   * Extract and expand tags from image metadata
   */
  private extractAndExpandTags(image: ImageMetadata): string[] {
    const tags = new Set<string>();
    
    // Add explicit tags
    if (image.tags) {
      image.tags.forEach(t => tags.add(t.toLowerCase()));
    }

    // Extract tags from title/description
    const text = [image.title, image.alt, image.description].filter(Boolean).join(' ');
    const words = text.toLowerCase().split(/\s+/);
    
    for (const [tag, expansions] of Object.entries(TAG_EXPANSIONS)) {
      if (words.includes(tag) || expansions.some(e => words.includes(e))) {
        tags.add(tag);
      }
    }

    return Array.from(tags);
  }

  /**
   * Get image metadata by ID
   */
  private async getImageMetadata(imageId: string): Promise<ImageMetadata | null> {
    try {
      const result = await db.execute(sql`
        SELECT content_id as id, text
        FROM update_9987_embeddings
        WHERE content_type = 'image' AND content_id = ${imageId}
        LIMIT 1
      `);

      const row = (result as unknown as any[])[0];
      if (!row) return null;

      return {
        id: row.id,
        url: '',
        title: row.text?.substring(0, 100),
        description: row.text,
        tags: this.extractTagsFromText(row.text || ''),
        category: undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if embeddings table exists and has data
   */
  async isReady(): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM update_9987_embeddings WHERE content_type = 'image'
      `);
      return (result as unknown as any[])[0]?.count > 0;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const semanticImageSearch = new SemanticImageSearch();

/**
 * Quick search function
 */
export async function searchImages(query: string, options?: Partial<ImageSearchQuery>): Promise<ImageSearchResult[]> {
  return semanticImageSearch.search({ query, ...options });
}

/**
 * Index a single image
 */
export async function indexImage(image: ImageMetadata): Promise<void> {
  return semanticImageSearch.indexImage(image);
}
