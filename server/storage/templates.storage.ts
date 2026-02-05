import {
  eq,
  desc,
  sql,
  db,
  contentTemplates,
  type ContentTemplate,
  type InsertContentTemplate,
} from "./base";

export class TemplatesStorage {
  async getContentTemplates(): Promise<ContentTemplate[]> {
    return await db
      .select()
      .from(contentTemplates)
      .orderBy(desc(contentTemplates.usageCount), contentTemplates.name);
  }

  async getContentTemplate(id: string): Promise<ContentTemplate | undefined> {
    const [template] = await db.select().from(contentTemplates).where(eq(contentTemplates.id, id));
    return template;
  }

  async createContentTemplate(template: InsertContentTemplate): Promise<ContentTemplate> {
    const [newTemplate] = await db
      .insert(contentTemplates)
      .values(template as any)
      .returning();
    return newTemplate;
  }

  async updateContentTemplate(
    id: string,
    data: Partial<InsertContentTemplate>
  ): Promise<ContentTemplate | undefined> {
    const [template] = await db
      .update(contentTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(contentTemplates.id, id))
      .returning();
    return template;
  }

  async deleteContentTemplate(id: string): Promise<boolean> {
    await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
    return true;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(contentTemplates)
      .set({ usageCount: sql`${contentTemplates.usageCount} + 1` } as any)
      .where(eq(contentTemplates.id, id));
  }
}

export const templatesStorage = new TemplatesStorage();
