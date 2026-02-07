// Stub - Cognitive Layer disabled
export function getCognitiveInsights() {
  return {};
}
export function syncSearchIntentToChat(_intent: unknown, _chatId?: string) {
  /* empty */
}
export function getIntentBoostForEntityType(_entityType: string, _extra?: unknown) {
  return 1;
}
export function getDominantUnifiedIntent(_intents: unknown) {
  return null;
}
export const cognitiveLayer = { getInsights: () => ({}) };
