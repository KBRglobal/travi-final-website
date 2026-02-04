// Stub - entity resolver disabled
export type EntityType = "destination" | "attraction" | "hotel" | "article" | "guide";
export async function resolveEntity(query: string): Promise<any> {
  return null;
}
export async function resolveEntities(queries: string[]): Promise<any[]> {
  return [];
}
export async function resolveEntityLink(type: EntityType, id: string): Promise<string | null> {
  return null;
}
