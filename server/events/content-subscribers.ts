/**
 * Content Event Subscribers
 * Phase 15A: Automatic reactions to content lifecycle events
 *
 * Subscribers:
 * 1. Search Indexer - Auto-index on publish
 * 2. AEO Generator - Auto-generate capsules on publish
 * 3. Internal Link Injector - Auto-inject internal links on publish
 */

import {
  contentEvents,
  type ContentPublishedEvent,
  type ContentUpdatedEvent,
} from "./content-events";
import { searchIndexer } from "../search/indexer";
import { generateAnswerCapsule } from "../aeo/answer-capsule-generator";
import { generateAEOSchema } from "../aeo/aeo-schema-generator";
import { injectInternalLinks } from "../seo-enforcement";
import { db } from "../db";
import { contents } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { log } from "../lib/logger";

const subscriberLogger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ContentSubscribers] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ContentSubscribers] ${msg}`, undefined, data),
};

// ============================================================================
// Search Indexer Subscriber
// ============================================================================

async function handleSearchIndexOnPublish(event: ContentPublishedEvent): Promise<void> {
  subscriberLogger.info("Auto-indexing published content for search", {
    contentId: event.contentId,
    type: event.contentType,
  });

  try {
    await searchIndexer.indexContent(event.contentId);
    subscriberLogger.info("Search indexing completed", {
      contentId: event.contentId,
    });
  } catch (error) {
    subscriberLogger.error("Search indexing failed", {
      contentId: event.contentId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Don't rethrow - we don't want to break other subscribers
  }
}

async function handleSearchIndexOnUpdate(event: ContentUpdatedEvent): Promise<void> {
  // Only re-index if content is still published
  if (event.status !== "published") {
    return;
  }

  subscriberLogger.info("Re-indexing updated content for search", {
    contentId: event.contentId,
  });

  try {
    await searchIndexer.indexContent(event.contentId);
    subscriberLogger.info("Search re-indexing completed", {
      contentId: event.contentId,
    });
  } catch (error) {
    subscriberLogger.error("Search re-indexing failed", {
      contentId: event.contentId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// AEO Generator Subscriber
// ============================================================================

async function handleAEOGenerationOnPublish(event: ContentPublishedEvent): Promise<void> {
  subscriberLogger.info("Auto-generating AEO capsule for published content", {
    contentId: event.contentId,
    type: event.contentType,
  });

  try {
    // Check if capsule already exists
    const [content] = await db
      .select({ answerCapsule: contents.answerCapsule })
      .from(contents)
      .where(eq(contents.id, event.contentId))
      .limit(1);

    if (content?.answerCapsule) {
      subscriberLogger.info("AEO capsule already exists, skipping generation", {
        contentId: event.contentId,
      });
      return;
    }

    // Generate answer capsule (uses AnswerCapsuleInput object)
    const capsuleResult = await generateAnswerCapsule({
      contentId: event.contentId,
      locale: "en",
      forceRegenerate: false,
    });

    subscriberLogger.info("AEO capsule generated successfully", {
      contentId: event.contentId,
      capsuleWordCount: capsuleResult.wordCount,
      qualityScore: capsuleResult.qualityScore,
      keyFactsCount: capsuleResult.keyFacts?.length || 0,
    });

    // Also generate JSON-LD schema
    try {
      await generateAEOSchema(event.contentId, { locale: "en" });
      subscriberLogger.info("AEO schema generated successfully", {
        contentId: event.contentId,
      });
    } catch (schemaError) {
      subscriberLogger.error("AEO schema generation failed", {
        contentId: event.contentId,
        error: schemaError instanceof Error ? schemaError.message : "Unknown error",
      });
    }
  } catch (error) {
    subscriberLogger.error("AEO generation process failed", {
      contentId: event.contentId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Don't rethrow - we don't want to break other subscribers
  }
}

// ============================================================================
// Internal Linking Subscriber
// ============================================================================

async function handleInternalLinkingOnPublish(event: ContentPublishedEvent): Promise<void> {
  subscriberLogger.info("Auto-injecting internal links for published content", {
    contentId: event.contentId,
    type: event.contentType,
  });

  try {
    const [content] = await db
      .select({ id: contents.id, blocks: contents.blocks })
      .from(contents)
      .where(eq(contents.id, event.contentId))
      .limit(1);

    if (!content?.blocks || content.blocks.length === 0) {
      subscriberLogger.info("No blocks to inject links into", { contentId: event.contentId });
      return;
    }

    // Convert blocks to HTML string for link injection
    let hasChanges = false;
    const updatedBlocks = content.blocks.map((block: any) => {
      if (block.type === "text" || block.type === "paragraph" || block.type === "html") {
        let html = "";
        if (typeof block.data?.html === "string") {
          html = block.data.html;
        } else if (typeof block.data?.text === "string") {
          html = block.data.text;
        }
        if (html) {
          const injected = injectInternalLinks(html);
          if (injected !== html) {
            hasChanges = true;
            return { ...block, data: { ...block.data, html: injected, text: injected } };
          }
        }
      }
      return block;
    });

    if (hasChanges) {
      await db
        .update(contents)
        .set({ blocks: updatedBlocks } as any)
        .where(eq(contents.id, event.contentId));

      subscriberLogger.info("Internal links injected successfully", {
        contentId: event.contentId,
      });
    } else {
      subscriberLogger.info("Internal links already sufficient, skipped", {
        contentId: event.contentId,
      });
    }
  } catch (error) {
    subscriberLogger.error("Internal linking failed", {
      contentId: event.contentId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;
let lastInitializedAt: Date | null = null;

/**
 * Initialize all content event subscribers
 * Call this once on server startup
 */
export function initializeContentSubscribers(): void {
  if (initialized) {
    subscriberLogger.info("Content subscribers already initialized");
    return;
  }

  subscriberLogger.info("Initializing content event subscribers...");

  // Subscribe search indexer to publish events
  contentEvents.onPublished(handleSearchIndexOnPublish, "SearchIndexer");

  // Subscribe search indexer to update events (for re-indexing)
  contentEvents.onUpdated(handleSearchIndexOnUpdate, "SearchIndexer");

  // Subscribe AEO generator to publish events
  contentEvents.onPublished(handleAEOGenerationOnPublish, "AEOGenerator");

  // Subscribe internal linking to publish events
  contentEvents.onPublished(handleInternalLinkingOnPublish, "InternalLinkInjector");

  initialized = true;
  lastInitializedAt = new Date();

  const stats = contentEvents.getStats();
  subscriberLogger.info("Content subscribers initialized", {
    subscribers: stats.subscribers,
  });
}

/**
 * Get subscriber status for debugging
 */
export function getSubscriberStatus(): {
  initialized: boolean;
  lastInitializedAt: string | null;
  stats: ReturnType<typeof contentEvents.getStats>;
} {
  return {
    initialized,
    lastInitializedAt: lastInitializedAt?.toISOString() || null,
    stats: contentEvents.getStats(),
  };
}
