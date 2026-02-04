/**
 * Homepage Seed Data - Stub Module
 */

export const homepageSeed = { sections: [], success: true };

export async function seedHomepage(): Promise<{ sections: any[]; success: boolean }> {
  return { sections: [], success: true };
}

export async function seedCategoryPage(
  type: "hotels" | "dining" | "districts" | "shopping"
): Promise<{ sections: any[]; success: boolean }> {
  return { sections: [], success: true };
}
