import { db, inArray, contents } from "./base";

export class BulkStorage {
  async bulkUpdateContentStatus(ids: string[], status: string): Promise<number> {
    const result = await db
      .update(contents)
      .set({ status: status as any, updatedAt: new Date() } as any)
      .where(inArray(contents.id, ids))
      .returning();
    return result.length;
  }

  async bulkDeleteContents(ids: string[]): Promise<number> {
    const result = await db.delete(contents).where(inArray(contents.id, ids)).returning();
    return result.length;
  }
}

export const bulkStorage = new BulkStorage();
