/**
 * AEO Exists Rule
 * Blocks content without an answer capsule.
 */

import { db } from '../../db';
import { contents } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const aeoExistsRule = {
  name: 'aeo-exists',
  description: 'Content must have an AEO answer capsule',

  async evaluate(contentId: string): Promise<any> {
    try {
      const result = await db
        .select({
          answerCapsule: contents.answerCapsule,
          aeoScore: contents.aeoScore,
        })
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      if (result.length === 0) {
        return {
          rule: this.name,
          result: 'BLOCK',
          message: 'Content not found',
          details: { exists: false },
        };
      }

      const content = result[0];
      const hasAeoCapsule = !!content.answerCapsule && content.answerCapsule.trim().length > 0;
      const aeoScore = content.aeoScore || 0;

      if (!hasAeoCapsule) {
        return {
          rule: this.name,
          result: 'BLOCK',
          message: 'Content is missing an answer capsule for AEO',
          details: { hasAeoCapsule: false, aeoScore },
        };
      }

      if (aeoScore < 50) {
        return {
          rule: this.name,
          result: 'WARN',
          message: `AEO score is low (${aeoScore}/100)`,
          details: { hasAeoCapsule: true, aeoScore },
        };
      }

      return {
        rule: this.name,
        result: 'PASS',
        message: `AEO capsule present with score ${aeoScore}/100`,
        details: { hasAeoCapsule: true, aeoScore },
      };
    } catch (error) {
      return {
        rule: this.name,
        result: 'WARN',
        message: 'Could not verify AEO status',
        details: { error: error instanceof Error ? error.message : 'Unknown' },
      };
    }
  },
};
