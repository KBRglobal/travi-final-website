/**
 * AI Module Utility Functions
 */

/**
 * Generate a unique block ID for content blocks
 */
export function generateBlockId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .trim();
}
