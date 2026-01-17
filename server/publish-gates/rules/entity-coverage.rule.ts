/**
 * Entity Coverage Rule
 * Blocks content with no entities attached.
 */

import { db } from '../../db';
import { entityTags } from '@shared/schema';
import { eq, count } from 'drizzle-orm';

export const entityCoverageRule = {
  name: 'entity-coverage',
  description: 'Content must have at least one entity attached',

  async evaluate(contentId: string): Promise<any> {
    try {
      const result = await db
        .select({ count: count() })
        .from(entityTags)
        .where(eq(entityTags.entityId, contentId));

      const entityCount = result[0]?.count || 0;

      if (entityCount === 0) {
        return {
          rule: this.name,
          result: 'BLOCK',
          message: 'Content has no entities attached',
          details: { entityCount: 0 },
        };
      }

      if (entityCount < 3) {
        return {
          rule: this.name,
          result: 'WARN',
          message: `Content has only ${entityCount} entities (recommended: 3+)`,
          details: { entityCount },
        };
      }

      return {
        rule: this.name,
        result: 'PASS',
        message: `Content has ${entityCount} entities`,
        details: { entityCount },
      };
    } catch (error) {
      // On error, don't block - log and pass
      return {
        rule: this.name,
        result: 'WARN',
        message: 'Could not verify entity coverage',
        details: { error: error instanceof Error ? error.message : 'Unknown' },
      };
    }
  },
};
