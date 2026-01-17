import { db } from "./db";
import { cmsTranslations, type CmsTranslation, type InsertCmsTranslation } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

// Valid entity types matching the enum
type CmsEntityType = 
  | "homepage_section"
  | "homepage_card"
  | "experience_category"
  | "region_link"
  | "hero_slide"
  | "homepage_cta"
  | "homepage_seo_meta";

// Default locale used when no locale is specified
const DEFAULT_LOCALE = "en";

/**
 * Get translations for a specific entity
 * @param entityType - The type of CMS entity
 * @param entityId - The ID of the entity (string or number)
 * @param locale - The locale to get translations for (defaults to 'en')
 * @returns Object mapping field names to translated values
 */
export async function getTranslations(
  entityType: CmsEntityType,
  entityId: string | number,
  locale: string = DEFAULT_LOCALE
): Promise<Record<string, string | null>> {
  const translations = await db.select()
    .from(cmsTranslations)
    .where(and(
      eq(cmsTranslations.entityType, entityType),
      eq(cmsTranslations.entityId, String(entityId)),
      eq(cmsTranslations.locale, locale)
    ));

  return translations.reduce((acc, t) => {
    acc[t.field] = t.value;
    return acc;
  }, {} as Record<string, string | null>);
}

/**
 * Get translations for multiple entities at once
 * @param entityType - The type of CMS entity
 * @param entityIds - Array of entity IDs
 * @param locale - The locale to get translations for
 * @returns Map of entityId -> { field: value }
 */
export async function getBulkTranslations(
  entityType: CmsEntityType,
  entityIds: (string | number)[],
  locale: string = DEFAULT_LOCALE
): Promise<Map<string, Record<string, string | null>>> {
  if (entityIds.length === 0) return new Map();

  const stringIds = entityIds.map(String);
  const translations = await db.select()
    .from(cmsTranslations)
    .where(and(
      eq(cmsTranslations.entityType, entityType),
      inArray(cmsTranslations.entityId, stringIds),
      eq(cmsTranslations.locale, locale)
    ));

  const result = new Map<string, Record<string, string | null>>();
  
  // Initialize all IDs with empty objects
  stringIds.forEach(id => result.set(id, {}));
  
  // Fill in translations
  translations.forEach(t => {
    const existing = result.get(t.entityId) || {};
    existing[t.field] = t.value;
    result.set(t.entityId, existing);
  });

  return result;
}

/**
 * Set a translation for a specific entity field
 * @param entityType - The type of CMS entity
 * @param entityId - The ID of the entity
 * @param locale - The locale to set
 * @param field - The field name to translate
 * @param value - The translated value
 */
export async function setTranslation(
  entityType: CmsEntityType,
  entityId: string | number,
  locale: string,
  field: string,
  value: string | null
): Promise<void> {
  const stringId = String(entityId);
  
  // Use upsert pattern - insert or update on conflict
  await db.insert(cmsTranslations)
    .values({
      entityType,
      entityId: stringId,
      locale,
      field,
      value,
    } as any)
    .onConflictDoUpdate({
      target: [cmsTranslations.entityType, cmsTranslations.entityId, cmsTranslations.locale, cmsTranslations.field],
      set: {
        value,
        updatedAt: new Date(),
      } as any
    });
}

/**
 * Set multiple translations for an entity at once
 * @param entityType - The type of CMS entity
 * @param entityId - The ID of the entity
 * @param locale - The locale to set
 * @param translations - Object mapping field names to values
 */
export async function setTranslations(
  entityType: CmsEntityType,
  entityId: string | number,
  locale: string,
  translations: Record<string, string | null | undefined>
): Promise<void> {
  const stringId = String(entityId);
  const entries = Object.entries(translations).filter(([_, v]) => v !== undefined);
  
  if (entries.length === 0) return;

  for (const [field, value] of entries) {
    await setTranslation(entityType, stringId, locale, field, value ?? null);
  }
}

/**
 * Delete all translations for an entity
 * @param entityType - The type of CMS entity
 * @param entityId - The ID of the entity
 */
export async function deleteEntityTranslations(
  entityType: CmsEntityType,
  entityId: string | number
): Promise<void> {
  await db.delete(cmsTranslations)
    .where(and(
      eq(cmsTranslations.entityType, entityType),
      eq(cmsTranslations.entityId, String(entityId))
    ));
}

/**
 * Get an entity with its translations merged in
 * Replaces specified fields with their translated values
 * @param entity - The base entity object with id field
 * @param entityType - The type of CMS entity
 * @param translatableFields - Array of field names that should be translated
 * @param locale - The locale to use
 * @returns Entity with translated field values
 */
export async function getTranslatedEntity<T extends { id: string | number }>(
  entity: T,
  entityType: CmsEntityType,
  translatableFields: (keyof T)[],
  locale: string = DEFAULT_LOCALE
): Promise<T> {
  const translations = await getTranslations(entityType, entity.id, locale);
  
  const result = { ...entity };
  for (const field of translatableFields) {
    const fieldName = field as string;
    if (fieldName in translations && translations[fieldName] !== null) {
      (result as any)[field] = translations[fieldName];
    }
  }
  
  return result;
}

/**
 * Get multiple entities with their translations merged in
 * @param entities - Array of base entity objects
 * @param entityType - The type of CMS entity
 * @param translatableFields - Array of field names that should be translated
 * @param locale - The locale to use
 * @returns Array of entities with translated field values
 */
export async function getTranslatedEntities<T extends { id: string | number }>(
  entities: T[],
  entityType: CmsEntityType,
  translatableFields: (keyof T)[],
  locale: string = DEFAULT_LOCALE
): Promise<T[]> {
  if (entities.length === 0) return [];

  const translationsMap = await getBulkTranslations(
    entityType,
    entities.map(e => e.id),
    locale
  );

  return entities.map(entity => {
    const translations = translationsMap.get(String(entity.id)) || {};
    const result = { ...entity };
    
    for (const field of translatableFields) {
      const fieldName = field as string;
      if (fieldName in translations && translations[fieldName] !== null) {
        (result as any)[field] = translations[fieldName];
      }
    }
    
    return result;
  });
}

/**
 * Get all available locales that have translations for an entity type
 */
export async function getAvailableLocales(entityType: CmsEntityType): Promise<string[]> {
  const result = await db.selectDistinct({ locale: cmsTranslations.locale })
    .from(cmsTranslations)
    .where(eq(cmsTranslations.entityType, entityType));
  
  return result.map(r => r.locale);
}

/**
 * Copy translations from one locale to another for all entities of a type
 * Useful for initializing a new language
 */
export async function copyLocaleTranslations(
  entityType: CmsEntityType,
  sourceLocale: string,
  targetLocale: string
): Promise<number> {
  const sourceTranslations = await db.select()
    .from(cmsTranslations)
    .where(and(
      eq(cmsTranslations.entityType, entityType),
      eq(cmsTranslations.locale, sourceLocale)
    ));

  let count = 0;
  for (const t of sourceTranslations) {
    await setTranslation(entityType, t.entityId, targetLocale, t.field, t.value);
    count++;
  }

  return count;
}
