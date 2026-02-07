import { db } from "../db";
import { contents, auditLogs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { emitContentPublished, emitContentUpdated } from "../events";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "reviewed"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "reviewed", "approved", "scheduled", "published"],
  in_review: ["draft", "reviewed", "approved"],
  reviewed: ["draft", "approved", "scheduled", "published"],
  approved: ["draft", "reviewed", "scheduled", "published"],
  scheduled: ["draft", "reviewed", "approved", "published"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export interface TransitionResult {
  success: boolean;
  previousStatus?: ContentStatus;
  newStatus?: ContentStatus;
  error?: string;
}

export function isValidTransition(currentStatus: ContentStatus, newStatus: ContentStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

export function getValidTransitions(currentStatus: ContentStatus): ContentStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

export async function transitionState(
  contentId: string,
  newStatus: ContentStatus,
  userId?: string
): Promise<TransitionResult> {
  const [content] = await db
    .select({ id: contents.id, status: contents.status, title: contents.title })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    return {
      success: false,
      error: `Content with ID ${contentId} not found`,
    };
  }

  const currentStatus = content.status as ContentStatus;

  if (currentStatus === newStatus) {
    return {
      success: true,
      previousStatus: currentStatus,
      newStatus: currentStatus,
    };
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    const validOptions = getValidTransitions(currentStatus);
    return {
      success: false,
      previousStatus: currentStatus,
      error: `Invalid transition from '${currentStatus}' to '${newStatus}'. Valid transitions: ${validOptions.join(", ") || "none"}`,
    };
  }

  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "published" && !content.status?.includes("published")) {
    updateData.publishedAt = new Date();
  }

  if (newStatus === "archived") {
    updateData.deletedAt = new Date();
  }

  if (newStatus === "draft" && currentStatus === "archived") {
    updateData.deletedAt = null;
  }

  await db.update(contents).set(updateData).where(eq(contents.id, contentId));

  try {
    await db.insert(auditLogs).values({
      userId: userId || null,
      userName: userId ? undefined : "system",
      actionType: "status_change",
      entityType: "content",
      entityId: contentId,
      description: `Content status changed from '${currentStatus}' to '${newStatus}' for "${content.title}"`,
      beforeState: { status: currentStatus },
      afterState: { status: newStatus },
      ipAddress: "system",
      userAgent: "content-lifecycle",
    } as any);
  } catch (error) {
    /* ignored */
  }

  // Phase 15C: Emit content lifecycle events for downstream subscribers
  // This ensures search indexing, AEO generation, and other subscribers are triggered
  // regardless of how the content status is changed (routes, auto-pilot, lifecycle module)
  if (newStatus === "published" && currentStatus !== "published") {
    // Fetch full content for event emission
    const [fullContent] = await db
      .select({ type: contents.type, slug: contents.slug })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (fullContent) {
      emitContentPublished(
        contentId,
        fullContent.type,
        content.title,
        fullContent.slug,
        currentStatus,
        "manual" // Source: lifecycle module transition
      );
    }
  }

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus: newStatus,
  };
}

export async function bulkTransitionState(
  contentIds: string[],
  newStatus: ContentStatus,
  userId?: string
): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
  const successful: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const contentId of contentIds) {
    const result = await transitionState(contentId, newStatus, userId);
    if (result.success) {
      successful.push(contentId);
    } else {
      failed.push({ id: contentId, error: result.error || "Unknown error" });
    }
  }

  return { successful, failed };
}

export async function canPublish(
  contentId: string
): Promise<{ canPublish: boolean; reason?: string }> {
  const [content] = await db
    .select({
      id: contents.id,
      status: contents.status,
      title: contents.title,
      metaTitle: contents.metaTitle,
      metaDescription: contents.metaDescription,
      slug: contents.slug,
    })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    return { canPublish: false, reason: "Content not found" };
  }

  const currentStatus = content.status as ContentStatus;
  if (!isValidTransition(currentStatus, "published")) {
    return {
      canPublish: false,
      reason: `Cannot publish from '${currentStatus}' status. Must be in: ${VALID_TRANSITIONS[currentStatus]?.join(", ") || "none"}`,
    };
  }

  if (!content.title || content.title.trim().length === 0) {
    return { canPublish: false, reason: "Title is required" };
  }

  if (!content.slug || content.slug.trim().length === 0) {
    return { canPublish: false, reason: "Slug is required" };
  }

  return { canPublish: true };
}

export { VALID_TRANSITIONS };
