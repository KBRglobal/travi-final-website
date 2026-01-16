/**
 * LEGACY TRAVI Content Generator
 * 
 * This module has been deprecated in favor of the new Tiqets integration system.
 * Content generation for Tiqets attractions will use Freepik + AI separately.
 */

export interface GeneratedLocationContent {
  h1Title: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  whyVisit: string;
  visitorExperience: string;
  bestTimeToVisit: string;
  howToGetThere: string;
  keyHighlights: string[];
}

export async function generateLocationContent(
  locationId: string,
  providerName: string
): Promise<GeneratedLocationContent> {
  throw new Error("This function has been deprecated. Use the new Tiqets content generation system.");
}

export async function saveGeneratedContent(
  locationId: string,
  content: GeneratedLocationContent,
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  throw new Error("This function has been deprecated. Use the new Tiqets content generation system.");
}
