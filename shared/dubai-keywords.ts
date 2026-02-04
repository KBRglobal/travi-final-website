// Stub - dubai keywords removed (destination-agnostic)
export interface TopicKeyword {
  topic: string;
  keywords: string[];
}

export const DUBAI_KEYWORDS: Record<string, { name: string; topics: TopicKeyword[] }> = {};
export function searchTopics(_query: string): TopicKeyword[] {
  return [];
}
export function getAllTopics(): TopicKeyword[] {
  return [];
}
export function getTopicsByCategory(_cat: string): TopicKeyword[] {
  return [];
}
export const IMAGE_TYPES: string[] = [];
