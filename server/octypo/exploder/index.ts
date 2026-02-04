/**
 * Content Exploder Module
 * Transform 1 article into 10-50 new articles by extracting entities
 * and generating targeted content for SEO/AEO optimization
 */

export * from "./types";
export { getEntityExtractor, EntityExtractor } from "./entity-extractor";
export { getEntityMatcher, EntityMatcher } from "./entity-matcher";
export { getArticleIdeation, ArticleIdeation } from "./article-ideation";
export { getExplosionOrchestrator, ExplosionOrchestrator } from "./explosion-orchestrator";

import { getExplosionOrchestrator } from "./explosion-orchestrator";
import { ExplosionConfig } from "./types";

/**
 * Quick API for content explosion
 */
export const exploder = {
  /**
   * Start explosion job for a content item
   */
  async explode(contentId: string, config?: ExplosionConfig): Promise<string> {
    const orchestrator = getExplosionOrchestrator();
    return orchestrator.startExplosion(contentId, config);
  },

  /**
   * Get job progress
   */
  async getProgress(jobId: string) {
    const orchestrator = getExplosionOrchestrator();
    return orchestrator.getJobProgress(jobId);
  },

  /**
   * Cancel running job
   */
  async cancel(jobId: string): Promise<boolean> {
    const orchestrator = getExplosionOrchestrator();
    return orchestrator.cancelJob(jobId);
  },
};
