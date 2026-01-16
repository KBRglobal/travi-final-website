/**
 * Blocks Valid Rule
 * Blocks content with empty or invalid content blocks.
 */

import { db } from '../../db';
import { contents, type ContentBlock } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { GateRule, GateEvaluation } from '../types';

const MIN_BLOCKS = 1;
const MIN_WORD_COUNT = 100;

function countWords(blocks: ContentBlock[]): number {
  let wordCount = 0;

  for (const block of blocks) {
    if (block.data) {
      // Extract text from common block data structures
      const text = String(block.data.text || block.data.content || '');
      wordCount += text.split(/\s+/).filter(w => w.length > 0).length;

      // Handle list items
      if (Array.isArray(block.data.items)) {
        for (const item of block.data.items) {
          const itemText = typeof item === 'string' ? item : String(item.content || item.text || '');
          wordCount += itemText.split(/\s+/).filter(w => w.length > 0).length;
        }
      }
    }
  }

  return wordCount;
}

function validateBlocks(blocks: ContentBlock[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!blocks || blocks.length === 0) {
    issues.push('No content blocks');
    return { valid: false, issues };
  }

  // Check for empty blocks
  const emptyBlocks = blocks.filter(b => {
    if (!b.type) return true;
    if (!b.data) return true;
    const text = String(b.data.text || b.data.content || '');
    return text.trim().length === 0 && !b.data.items && !b.data.url;
  });

  if (emptyBlocks.length > 0) {
    issues.push(`${emptyBlocks.length} empty block(s)`);
  }

  return { valid: issues.length === 0, issues };
}

export const blocksValidRule: GateRule = {
  name: 'blocks-valid',
  description: 'Content must have valid, non-empty blocks with sufficient content',

  async evaluate(contentId: string): Promise<GateEvaluation> {
    try {
      const result = await db
        .select({
          blocks: contents.blocks,
          wordCount: contents.wordCount,
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
      const blocks = (content.blocks || []) as ContentBlock[];
      const validation = validateBlocks(blocks);
      const wordCount = content.wordCount || countWords(blocks);

      if (blocks.length < MIN_BLOCKS) {
        return {
          rule: this.name,
          result: 'BLOCK',
          message: 'Content has no blocks',
          details: {
            blockCount: blocks.length,
            wordCount,
            minBlocks: MIN_BLOCKS,
          },
        };
      }

      if (!validation.valid) {
        return {
          rule: this.name,
          result: 'BLOCK',
          message: `Invalid blocks: ${validation.issues.join(', ')}`,
          details: {
            blockCount: blocks.length,
            wordCount,
            issues: validation.issues,
          },
        };
      }

      if (wordCount < MIN_WORD_COUNT) {
        return {
          rule: this.name,
          result: 'WARN',
          message: `Content is short (${wordCount} words, recommended: ${MIN_WORD_COUNT}+)`,
          details: {
            blockCount: blocks.length,
            wordCount,
            minWordCount: MIN_WORD_COUNT,
          },
        };
      }

      return {
        rule: this.name,
        result: 'PASS',
        message: `Content has ${blocks.length} blocks with ${wordCount} words`,
        details: {
          blockCount: blocks.length,
          wordCount,
        },
      };
    } catch (error) {
      return {
        rule: this.name,
        result: 'WARN',
        message: 'Could not verify blocks',
        details: { error: error instanceof Error ? error.message : 'Unknown' },
      };
    }
  },
};
