/**
 * Search Index Rule
 * Warns if content is not indexed (blocks if explicitly required).
 */

import { db } from '../../db';
import { searchIndex } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { GateRule, GateEvaluation } from '../types';

export const searchIndexRule: GateRule = {
  name: 'search-index',
  description: 'Content should be indexed for search',

  async evaluate(contentId: string): Promise<GateEvaluation> {
    try {
      const result = await db
        .select({ contentId: searchIndex.contentId })
        .from(searchIndex)
        .where(eq(searchIndex.contentId, contentId))
        .limit(1);

      const isIndexed = result.length > 0;

      if (!isIndexed) {
        return {
          rule: this.name,
          result: 'WARN',
          message: 'Content is not in search index (will be indexed after publish)',
          details: { isIndexed: false },
        };
      }

      return {
        rule: this.name,
        result: 'PASS',
        message: 'Content is indexed for search',
        details: { isIndexed: true },
      };
    } catch (error) {
      return {
        rule: this.name,
        result: 'WARN',
        message: 'Could not verify search index status',
        details: { error: error instanceof Error ? error.message : 'Unknown' },
      };
    }
  },
};
