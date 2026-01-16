/**
 * SEO Slug Generator Utility
 * Generates clean, human-readable slugs for attractions
 */

export function generateSeoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to dashes
    .replace(/-+/g, '-')          // Multiple dashes to single
    .replace(/^-|-$/g, '')        // Trim dashes
    .substring(0, 100);           // Max length
}

export function generateUniqueSeoSlug(title: string, existingSlugs: string[]): string {
  let baseSlug = generateSeoSlug(title);
  if (!existingSlugs.includes(baseSlug)) return baseSlug;
  
  // Add numeric suffix for collisions
  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

/**
 * Extract a clean base name from attraction titles
 * e.g., "Burj Khalifa: At The Top Level 124/125 Ticket" → "burj-khalifa"
 */
export function extractBaseName(title: string): string {
  // Take first part before colons or pipes
  const basePart = title.split(/[:|–—]/)[0].trim();
  
  // Remove common suffixes like "Ticket", "Entry", "Tour", etc.
  const cleanedBase = basePart
    .replace(/\b(ticket|entry|tour|experience|admission|pass)\b/gi, '')
    .trim();
  
  return generateSeoSlug(cleanedBase || basePart);
}
