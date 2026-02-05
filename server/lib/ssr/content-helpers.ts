/**
 * Content Helper Functions
 */

import type { ContentWithRelations } from "@shared/schema";
import { BASE_URL } from "./constants";

/**
 * Get image from content
 */
export function getContentImage(content: ContentWithRelations): string {
  if (!content.blocks || !Array.isArray(content.blocks)) {
    return `${BASE_URL}/ogImage.jpg`;
  }

  for (const block of content.blocks) {
    if (block.type === "hero" && block.data?.imageUrl) {
      return String(block.data.imageUrl);
    }
    if (block.type === "image" && block.data?.src) {
      return String(block.data.src);
    }
  }

  return `${BASE_URL}/ogImage.jpg`;
}
