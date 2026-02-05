import { eq, desc, db, propertyLeads, type PropertyLead, type InsertPropertyLead } from "./base";

export class PropertyLeadsStorage {
  async getPropertyLeads(filters?: { status?: string }): Promise<PropertyLead[]> {
    if (filters?.status) {
      return await db
        .select()
        .from(propertyLeads)
        .where(eq(propertyLeads.status, filters.status as any))
        .orderBy(desc(propertyLeads.createdAt));
    }
    return await db.select().from(propertyLeads).orderBy(desc(propertyLeads.createdAt));
  }

  async getPropertyLead(id: string): Promise<PropertyLead | undefined> {
    const [lead] = await db.select().from(propertyLeads).where(eq(propertyLeads.id, id));
    return lead;
  }

  async createPropertyLead(lead: InsertPropertyLead): Promise<PropertyLead> {
    const [newLead] = await db
      .insert(propertyLeads)
      .values(lead as any)
      .returning();
    return newLead;
  }

  async updatePropertyLead(
    id: string,
    data: Partial<InsertPropertyLead>
  ): Promise<PropertyLead | undefined> {
    const [lead] = await db
      .update(propertyLeads)
      .set(data as any)
      .where(eq(propertyLeads.id, id))
      .returning();
    return lead;
  }

  async deletePropertyLead(id: string): Promise<boolean> {
    await db.delete(propertyLeads).where(eq(propertyLeads.id, id));
    return true;
  }
}

export const propertyLeadsStorage = new PropertyLeadsStorage();
