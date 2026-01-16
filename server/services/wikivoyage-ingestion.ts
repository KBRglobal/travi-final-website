import { db } from "../db";
import { update9987Guides } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const WIKIVOYAGE_DOMAINS: Record<string, string> = {
  en: "en.wikivoyage.org",
  ar: "ar.wikivoyage.org",
  bn: "bn.wikivoyage.org",
  de: "de.wikivoyage.org",
  es: "es.wikivoyage.org",
  fa: "fa.wikivoyage.org",
  fr: "fr.wikivoyage.org",
  he: "he.wikivoyage.org",
  hi: "hi.wikivoyage.org",
  it: "it.wikivoyage.org",
  ja: "ja.wikivoyage.org",
  ko: "ko.wikivoyage.org",
  pt: "pt.wikivoyage.org",
  ru: "ru.wikivoyage.org",
  tr: "tr.wikivoyage.org",
  uk: "uk.wikivoyage.org",
  vi: "vi.wikivoyage.org",
  zh: "zh.wikivoyage.org",
  pl: "pl.wikivoyage.org",
  nl: "nl.wikivoyage.org",
  sv: "sv.wikivoyage.org",
  el: "el.wikivoyage.org",
  fi: "fi.wikivoyage.org",
  ro: "ro.wikivoyage.org",
};

const DESTINATION_WIKIVOYAGE_NAMES: Record<string, Record<string, string>> = {
  "abu-dhabi": { en: "Abu_Dhabi", ar: "أبوظبي", de: "Abu_Dhabi", es: "Abu_Dabi", fr: "Abou_Dabi", he: "אבו_דאבי", it: "Abu_Dhabi", ja: "アブダビ", ko: "아부다비", pt: "Abu_Dhabi", ru: "Абу-Даби", tr: "Abu_Dabi", zh: "阿布達比" },
  "amsterdam": { en: "Amsterdam", ar: "أمستردام", de: "Amsterdam", es: "Ámsterdam", fr: "Amsterdam", he: "אמסטרדם", hi: "एम्स्टर्डम", it: "Amsterdam", ja: "アムステルダム", ko: "암스테르담", pt: "Amesterdão", ru: "Амстердам", tr: "Amsterdam", zh: "阿姆斯特丹" },
  "bali": { en: "Bali", ar: "بالي", de: "Bali", es: "Bali", fr: "Bali", he: "באלי", hi: "बाली", it: "Bali", ja: "バリ島", ko: "발리", pt: "Bali", ru: "Бали", tr: "Bali", zh: "峇里島" },
  "bangkok": { en: "Bangkok", ar: "بانكوك", de: "Bangkok", es: "Bangkok", fr: "Bangkok", he: "בנגקוק", hi: "बैंकॉक", it: "Bangkok", ja: "バンコク", ko: "방콕", pt: "Banguecoque", ru: "Бангкок", tr: "Bangkok", zh: "曼谷" },
  "barcelona": { en: "Barcelona", ar: "برشلونة", de: "Barcelona", es: "Barcelona", fr: "Barcelone", he: "ברצלונה", hi: "बार्सिलोना", it: "Barcellona", ja: "バルセロナ", ko: "바르셀로나", pt: "Barcelona", ru: "Барселона", tr: "Barselona", zh: "巴塞罗那" },
  "dubai": { en: "Dubai", ar: "دبي", de: "Dubai", es: "Dubái", fr: "Dubaï", he: "דובאי", hi: "दुबई", it: "Dubai", ja: "ドバイ", ko: "두바이", pt: "Dubai", ru: "Дубай", tr: "Dubai", zh: "杜拜" },
  "hong-kong": { en: "Hong_Kong", ar: "هونغ_كونغ", de: "Hongkong", es: "Hong_Kong", fr: "Hong_Kong", he: "הונג_קונג", hi: "हांगकांग", it: "Hong_Kong", ja: "香港", ko: "홍콩", pt: "Hong_Kong", ru: "Гонконг", tr: "Hong_Kong", zh: "香港" },
  "istanbul": { en: "Istanbul", ar: "إسطنبول", de: "Istanbul", es: "Estambul", fr: "Istanbul", he: "איסטנבול", hi: "इस्तांबुल", it: "Istanbul", ja: "イスタンブール", ko: "이스탄불", pt: "Istambul", ru: "Стамбул", tr: "İstanbul", zh: "伊斯坦堡" },
  "las-vegas": { en: "Las_Vegas", ar: "لاس_فيغاس", de: "Las_Vegas", es: "Las_Vegas", fr: "Las_Vegas", he: "לאס_וגאס", hi: "लास_वेगास", it: "Las_Vegas", ja: "ラスベガス", ko: "라스베이거스", pt: "Las_Vegas", ru: "Лас-Вегас", tr: "Las_Vegas", zh: "拉斯維加斯" },
  "london": { en: "London", ar: "لندن", de: "London", es: "Londres", fr: "Londres", he: "לונדון", hi: "लंदन", it: "Londra", ja: "ロンドン", ko: "런던", pt: "Londres", ru: "Лондон", tr: "Londra", zh: "伦敦" },
  "los-angeles": { en: "Los_Angeles", ar: "لوس_أنجلوس", de: "Los_Angeles", es: "Los_Ángeles", fr: "Los_Angeles", he: "לוס_אנג'לס", hi: "लॉस_एंजिल्स", it: "Los_Angeles", ja: "ロサンゼルス", ko: "로스앤젤레스", pt: "Los_Angeles", ru: "Лос-Анджелес", tr: "Los_Angeles", zh: "洛杉磯" },
  "miami": { en: "Miami", ar: "ميامي", de: "Miami", es: "Miami", fr: "Miami", he: "מיאמי", hi: "मियामी", it: "Miami", ja: "マイアミ", ko: "마이애미", pt: "Miami", ru: "Майами", tr: "Miami", zh: "邁阿密" },
  "new-york": { en: "New_York_City", ar: "مدينة_نيويورك", de: "New_York_City", es: "Nueva_York", fr: "New_York", he: "ניו_יורק", hi: "न्यूयॉर्क", it: "New_York", ja: "ニューヨーク", ko: "뉴욕", pt: "Nova_Iorque", ru: "Нью-Йорк", tr: "New_York", zh: "紐約" },
  "paris": { en: "Paris", ar: "باريس", de: "Paris", es: "París", fr: "Paris", he: "פריז", hi: "पेरिस", it: "Parigi", ja: "パリ", ko: "파리", pt: "Paris", ru: "Париж", tr: "Paris", zh: "巴黎" },
  "ras-al-khaimah": { en: "Ras_al-Khaimah", ar: "رأس_الخيمة", de: "Ras_al-Chaima", es: "Ras_el-Jaima", fr: "Ras_el-Khaimah", he: "ראס_אל_חיימה", it: "Ras_al-Khaimah", ja: "ラアス・アル=ハイマ", ko: "라스알카이마", pt: "Ras_al-Khaimah", ru: "Рас-эль-Хайма", tr: "Resülhayme", zh: "哈伊馬角" },
  "rome": { en: "Rome", ar: "روما", de: "Rom", es: "Roma", fr: "Rome", he: "רומא", hi: "रोम", it: "Roma", ja: "ローマ", ko: "로마", pt: "Roma", ru: "Рим", tr: "Roma", zh: "羅馬" },
  "singapore": { en: "Singapore", ar: "سنغافورة", de: "Singapur", es: "Singapur", fr: "Singapour", he: "סינגפור", hi: "सिंगापुर", it: "Singapore", ja: "シンガポール", ko: "싱가포르", pt: "Singapura", ru: "Сингапур", tr: "Singapur", zh: "新加坡" },
  "sydney": { en: "Sydney", ar: "سيدني", de: "Sydney", es: "Sídney", fr: "Sydney", he: "סידני", hi: "सिडनी", it: "Sydney", ja: "シドニー", ko: "시드니", pt: "Sydney", ru: "Сидней", tr: "Sidney", zh: "悉尼" },
  "tokyo": { en: "Tokyo", ar: "طوكيو", de: "Tokio", es: "Tokio", fr: "Tokyo", he: "טוקיו", hi: "टोक्यो", it: "Tokyo", ja: "東京", ko: "도쿄", pt: "Tóquio", ru: "Токио", tr: "Tokyo", zh: "東京" },
};

interface WikivoyageSection {
  level: number;
  heading: string;
  content: string;
}

interface GuideTranslation {
  locale: string;
  title: string;
  summary: string;
  sections: WikivoyageSection[];
  sourceUrl: string;
  lastFetched: string;
}

interface GuideSections {
  translations: Record<string, GuideTranslation>;
  primaryLocale: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWikivoyagePage(destinationId: string, locale: string): Promise<{ title: string; content: string; sections: WikivoyageSection[] } | null> {
  const domain = WIKIVOYAGE_DOMAINS[locale];
  if (!domain) return null;

  const destinationNames = DESTINATION_WIKIVOYAGE_NAMES[destinationId];
  if (!destinationNames) return null;

  const pageName = destinationNames[locale] || destinationNames.en;
  if (!pageName) return null;

  const apiUrl = `https://${domain}/w/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=text|sections|displaytitle&format=json&origin=*`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "TraviBot/1.0 (https://travi.world; contact@travi.world)",
      },
    });

    if (!response.ok) {
      console.log(`[Wikivoyage] Failed to fetch ${destinationId} in ${locale}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.log(`[Wikivoyage] Non-JSON response for ${destinationId} in ${locale}: ${contentType}`);
      return null;
    }

    const responseText = await response.text();
    if (responseText.startsWith("<!DOCTYPE") || responseText.startsWith("<html")) {
      console.log(`[Wikivoyage] HTML response instead of JSON for ${destinationId} in ${locale}`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.log(`[Wikivoyage] Failed to parse JSON for ${destinationId} in ${locale}`);
      return null;
    }

    if (data.error) {
      console.log(`[Wikivoyage] API error for ${destinationId} in ${locale}: ${data.error.info}`);
      return null;
    }

    const parse = data.parse;
    if (!parse) return null;

    const htmlContent = parse.text?.["*"] || "";
    const title = parse.displaytitle || pageName.replace(/_/g, " ");

    const sections: WikivoyageSection[] = [];
    const apiSections = parse.sections || [];

    for (const sec of apiSections) {
      sections.push({
        level: parseInt(sec.level) || 2,
        heading: sec.line || "",
        content: "",
      });
    }

    return {
      title,
      content: htmlContent,
      sections,
    };
  } catch (error) {
    console.error(`[Wikivoyage] Error fetching ${destinationId} in ${locale}:`, error);
    return null;
  }
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/class="[^"]*"/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/id="[^"]*"/gi, "")
    .replace(/<a[^>]*href="\/wiki\/[^"]*"[^>]*>/gi, '<a href="#">')
    .replace(/<div[^>]*mw-[^>]*>/gi, "<div>")
    .replace(/<span[^>]*mw-[^>]*>/gi, "<span>")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummary(html: string): string {
  const textMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (textMatch) {
    const text = textMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 300) + (text.length > 300 ? "..." : "");
  }
  return "";
}

function parseWikivoyageSections(html: string): WikivoyageSection[] {
  const sections: WikivoyageSection[] = [];
  const headingPattern = /<h([2-4])[^>]*>(?:<span[^>]*>)?([^<]+)(?:<\/span>)?<\/h[2-4]>/gi;
  const parts = html.split(headingPattern);

  let currentHeading = "Introduction";
  let currentLevel = 2;
  let currentContent = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^[2-4]$/.test(part)) {
      if (currentContent.trim()) {
        sections.push({
          level: currentLevel,
          heading: currentHeading,
          content: sanitizeHtml(currentContent),
        });
      }
      currentLevel = parseInt(part);
      currentHeading = parts[i + 1] || "Section";
      currentContent = "";
      i++;
    } else {
      currentContent += part;
    }
  }

  if (currentContent.trim()) {
    sections.push({
      level: currentLevel,
      heading: currentHeading,
      content: sanitizeHtml(currentContent),
    });
  }

  return sections;
}

export async function importWikivoyageGuide(
  destinationId: string,
  destinationName: string,
  locales: string[] = ["en"]
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  const translations: Record<string, GuideTranslation> = {};
  let primaryTitle = destinationName;

  for (const locale of locales) {
    console.log(`[Wikivoyage] Fetching ${destinationId} in ${locale}...`);
    
    const pageData = await fetchWikivoyagePage(destinationId, locale);
    
    if (!pageData) {
      console.log(`[Wikivoyage] No content for ${destinationId} in ${locale}`);
      continue;
    }

    const sections = parseWikivoyageSections(pageData.content);
    const summary = extractSummary(pageData.content);
    const domain = WIKIVOYAGE_DOMAINS[locale] || "en.wikivoyage.org";
    const pageName = DESTINATION_WIKIVOYAGE_NAMES[destinationId]?.[locale] || 
                     DESTINATION_WIKIVOYAGE_NAMES[destinationId]?.en || destinationId;

    translations[locale] = {
      locale,
      title: pageData.title.replace(/<[^>]+>/g, ""),
      summary,
      sections,
      sourceUrl: `https://${domain}/wiki/${encodeURIComponent(pageName)}`,
      lastFetched: new Date().toISOString(),
    };

    if (locale === "en") {
      primaryTitle = pageData.title.replace(/<[^>]+>/g, "");
    }

    imported++;
    await delay(200);
  }

  if (Object.keys(translations).length === 0) {
    errors.push(`No translations fetched for ${destinationId}`);
    return { success: false, imported: 0, errors };
  }

  const guideSections: GuideSections = {
    translations,
    primaryLocale: "en",
  };

  const slug = `${destinationId}-travel-guide`;
  const enTranslation = translations.en;

  try {
    const existing = await db
      .select()
      .from(update9987Guides)
      .where(eq(update9987Guides.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(update9987Guides)
        .set({
          title: primaryTitle,
          originalContent: enTranslation?.sections.map(s => s.content).join("\n") || "",
          sections: guideSections as any,
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
          rawData: { source: "wikivoyage", locales: Object.keys(translations) } as any,
        })
        .where(eq(update9987Guides.slug, slug));
      console.log(`[Wikivoyage] Updated guide for ${destinationId}`);
    } else {
      await db.insert(update9987Guides).values({
        title: primaryTitle,
        slug,
        destinationType: "city",
        originalContent: enTranslation?.sections.map(s => s.content).join("\n") || "",
        sections: guideSections as any,
        status: "published",
        publishedAt: new Date(),
        rawData: { source: "wikivoyage", locales: Object.keys(translations) } as any,
      });
      console.log(`[Wikivoyage] Created guide for ${destinationId}`);
    }
  } catch (error) {
    const msg = `Database error for ${destinationId}: ${error}`;
    console.error(`[Wikivoyage] ${msg}`);
    errors.push(msg);
    return { success: false, imported, errors };
  }

  return { success: true, imported, errors };
}

export async function runFullWikivoyageIngestion(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Record<string, { imported: number; errors: string[] }>;
}> {
  const destinations = Object.keys(DESTINATION_WIKIVOYAGE_NAMES);
  const locales = Object.keys(WIKIVOYAGE_DOMAINS);
  
  const results: Record<string, { imported: number; errors: string[] }> = {};
  let success = 0;
  let failed = 0;

  console.log(`[Wikivoyage] Starting full ingestion for ${destinations.length} destinations in ${locales.length} languages...`);

  for (const destId of destinations) {
    const destName = destId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    
    const result = await importWikivoyageGuide(destId, destName, locales);
    results[destId] = { imported: result.imported, errors: result.errors };

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    await delay(1000);
  }

  console.log(`[Wikivoyage] Ingestion complete: ${success} success, ${failed} failed`);

  return {
    total: destinations.length,
    success,
    failed,
    results,
  };
}

export function getAvailableDestinations(): string[] {
  return Object.keys(DESTINATION_WIKIVOYAGE_NAMES);
}

export function getAvailableLocales(): string[] {
  return Object.keys(WIKIVOYAGE_DOMAINS);
}
