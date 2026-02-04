// Stub - cognitive layer disabled
// Re-export the shared type to ensure consistency
export type { UnifiedIntentType } from "@shared/intent-schema";
import type { UnifiedIntentType } from "@shared/intent-schema";

export class UnifiedCognitiveLayer {
  async process(input: any): Promise<any> {
    return {};
  }
  async analyze(content: string): Promise<any> {
    return {};
  }
}
export const cognitiveLayer = new UnifiedCognitiveLayer();

// Intent functions
export async function getUnifiedIntent(query: string): Promise<UnifiedIntentType | null> {
  return null;
}
export async function applySearchToChat(searchResults: any, chatContext: any): Promise<any> {
  return {};
}
export async function recordIntentSignal(signal: any): Promise<void> {}
export async function getIntentBasedEntitySuggestions(intent: any): Promise<any[]> {
  return [];
}
export async function describeSearchContextForChat(context: any): Promise<string> {
  return "";
}
export async function syncSearchIntentToChat(
  query: string,
  intent?: UnifiedIntentType
): Promise<void> {}
export function getIntentBoostForEntityType(
  type: string,
  intent?: UnifiedIntentType | null
): number {
  return 1;
}
export function getDominantUnifiedIntent(context?: any): UnifiedIntentType | null {
  return null;
}
