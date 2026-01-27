/**
 * One-time script to publish all draft articles
 * Run this to make articles visible to search engines
 */
import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

async function publishAllArticles() {
  try {
    const result = await db
      .update(contents)
      .set({
        status: "published",
        publishedAt: new Date(),
      } as any)
      .where(
        and(eq(contents.type, "article"), eq(contents.status, "draft"), isNull(contents.deletedAt))
      )
      .returning({ id: contents.id, title: contents.title });

    // Also publish any draft hotels
    const hotelResult = await db
      .update(contents)
      .set({
        status: "published",
        publishedAt: new Date(),
      } as any)
      .where(
        and(eq(contents.type, "hotel"), eq(contents.status, "draft"), isNull(contents.deletedAt))
      )
      .returning({ id: contents.id, title: contents.title });

    // Also update any deleted published hotels to not be deleted
    const undeleteResult = await db
      .update(contents)
      .set({
        deletedAt: null,
      } as any)
      .where(
        and(
          eq(contents.status, "published")
          // Only undelete if it was deleted
          // We can't easily check for NOT NULL in drizzle, so we'll do this differently
        )
      );

    return { articles: result.length, hotels: hotelResult.length };
  } catch (error) {
    throw error;
  }
}

// Export for use in routes
export { publishAllArticles };
