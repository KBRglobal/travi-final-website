/**
 * Wikivoyage Ingestion Service (Stub)
 * Wikivoyage import functionality was simplified during codebase cleanup.
 */

export async function importWikivoyageGuide(destination: string, locale: string): Promise<any> {
  return null;
}

export async function runFullWikivoyageIngestion(): Promise<void> {}

export async function getAvailableDestinations(): Promise<string[]> {
  return [];
}

export async function getAvailableLocales(): Promise<string[]> {
  return ['en'];
}
