/**
 * Optimistic Locking Middleware
 *
 * Implements ETag-based optimistic locking for content editing.
 * Uses the content's updatedAt timestamp as the version token.
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Generate ETag from a timestamp
 */
export function generateETag(updatedAt: Date | string): string {
  const timestamp = updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
  const hash = Buffer.from(timestamp).toString("base64").replaceAll("=", "");
  return `"${hash}"`;
}

/**
 * Parse ETag from header (removes quotes)
 */
export function parseETag(etag: string | undefined): string | null {
  if (!etag) return null;
  return etag.replaceAll(/(?:^["']|["']$)/g, "");
}

/**
 * Middleware to check If-Match header for optimistic locking
 * Returns 409 Conflict if version mismatch
 */
export function checkOptimisticLock() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const contentId = req.params.id;
    const ifMatch = req.headers["if-match"];

    // If no If-Match header, skip check (backward compatibility)
    if (!ifMatch) {
      return next();
    }

    try {
      // Fetch current content version
      const [content] = await db
        .select({ updatedAt: contents.updatedAt })
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);

      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Generate current ETag (use current time if no updatedAt)
      const currentETag = generateETag(content.updatedAt || new Date());
      const clientETag = parseETag(ifMatch);
      const serverETag = parseETag(currentETag);

      // Compare versions
      if (clientETag !== serverETag) {
        return res.status(409).json({
          error: "Conflict: Content has been modified",
          code: "VERSION_CONFLICT",
          currentVersion: currentETag,
          clientVersion: ifMatch,
          message: "The content was modified by another user. Please refresh and try again.",
          resolution: {
            options: ["refresh", "force_save", "merge"],
            refreshUrl: `/api/contents/${contentId}`,
          },
        });
      }

      next();
    } catch {
      next(); // Fail open - allow request to proceed
    }
  };
}

/**
 * Middleware to add ETag header to content responses
 */
export function addETagHeader() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Check if response contains content with updatedAt
      if (body && typeof body === "object") {
        const data = body as Record<string, unknown>;
        const updatedAt = data.updatedAt;

        if (updatedAt) {
          const etag = generateETag(updatedAt as Date | string);
          res.setHeader("ETag", etag);
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Helper to check if a request has version conflict
 */
export function hasVersionConflict(
  clientVersion: string | undefined,
  serverVersion: Date
): boolean {
  if (!clientVersion) return false;

  const serverETag = generateETag(serverVersion);
  return parseETag(clientVersion) !== parseETag(serverETag);
}
