// Stub - wikivoyage ingestion removed
export async function runFullWikivoyageIngestion(): Promise<{ imported: number }> {
  return { imported: 0 };
}

export async function importWikivoyageGuide(_destination: string): Promise<{ success: boolean }> {
  return { success: false };
}

export async function getAvailableDestinations(): Promise<string[]> {
  return [];
}

export async function getAvailableLocales(): Promise<string[]> {
  return ["en"];
}
