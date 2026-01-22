import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";
import { db } from "../db";
import { translations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://travi.world";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  region: string;
  tier: number;
  isRTL: boolean;
}

export function getLocaleInfo(locale: Locale): LocaleInfo | undefined {
  const info = SUPPORTED_LOCALES.find((l) => l.code === locale);
  if (!info) return undefined;
  return {
    ...info,
    isRTL: RTL_LOCALES.includes(locale),
  };
}

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function getLocalePath(path: string, locale: Locale): string {
  if (locale === "en") return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

export function getFullLocalizedUrl(path: string, locale: Locale): string {
  return `${BASE_URL}${getLocalePath(path, locale)}`;
}

export function getAllLocales(): LocaleInfo[] {
  return SUPPORTED_LOCALES.map((l) => ({
    ...l,
    isRTL: RTL_LOCALES.includes(l.code),
  }));
}

export function getLocalesByTier(tier: number): LocaleInfo[] {
  return getAllLocales().filter((l) => l.tier === tier);
}

export async function getTranslationWithFallback<T extends Record<string, unknown>>(
  contentId: string,
  locale: Locale,
  fields: (keyof T)[]
): Promise<Partial<T> | null> {
  if (locale === "en") {
    return null;
  }

  try {
    const [translation] = await db
      .select()
      .from(translations)
      .where(and(eq(translations.contentId, contentId), eq(translations.locale, locale as any)))
      .limit(1);

    if (translation) {
      const result: Partial<T> = {};
      for (const field of fields) {
        const value = translation[field as keyof typeof translation];
        if (value !== null && value !== undefined) {
          (result as any)[field] = value;
        }
      }
      return Object.keys(result).length > 0 ? result : null;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching translation for ${contentId} in ${locale}:`, error);
    return null;
  }
}

export function applyTranslationFallback<T extends Record<string, unknown>>(
  original: T,
  translation: Partial<T> | null
): T {
  if (!translation) return original;

  const result = { ...original };
  for (const [key, value] of Object.entries(translation)) {
    if (value !== null && value !== undefined && value !== "") {
      (result as any)[key] = value;
    }
  }
  return result;
}

export { BASE_URL };
