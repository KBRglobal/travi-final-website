/**
 * Script Validators for Locale Purity
 * ====================================
 * Unicode script ranges and locale-to-script mappings for all 30 supported locales
 */

/**
 * Unicode script ranges for content validation
 * Each range defines valid characters for a writing script
 */
export const SCRIPT_UNICODE_RANGES: Record<
  string,
  Array<{ start: number; end: number; name: string }>
> = {
  // Latin-based scripts
  latin: [
    { start: 0x0041, end: 0x005a, name: "Basic Latin uppercase" },
    { start: 0x0061, end: 0x007a, name: "Basic Latin lowercase" },
    { start: 0x00c0, end: 0x00ff, name: "Latin-1 Supplement" },
    { start: 0x0100, end: 0x017f, name: "Latin Extended-A" },
    { start: 0x0180, end: 0x024f, name: "Latin Extended-B" },
    { start: 0x1e00, end: 0x1eff, name: "Latin Extended Additional" },
  ],

  // Arabic script (Arabic, Persian, Urdu)
  arabic: [
    { start: 0x0600, end: 0x06ff, name: "Arabic" },
    { start: 0x0750, end: 0x077f, name: "Arabic Supplement" },
    { start: 0x08a0, end: 0x08ff, name: "Arabic Extended-A" },
    { start: 0xfb50, end: 0xfdff, name: "Arabic Presentation Forms-A" },
    { start: 0xfe70, end: 0xfeff, name: "Arabic Presentation Forms-B" },
  ],

  // Devanagari (Hindi)
  devanagari: [
    { start: 0x0900, end: 0x097f, name: "Devanagari" },
    { start: 0xa8e0, end: 0xa8ff, name: "Devanagari Extended" },
  ],

  // Bengali
  bengali: [{ start: 0x0980, end: 0x09ff, name: "Bengali" }],

  // Thai
  thai: [{ start: 0x0e00, end: 0x0e7f, name: "Thai" }],

  // CJK (Chinese)
  cjk: [
    { start: 0x4e00, end: 0x9fff, name: "CJK Unified Ideographs" },
    { start: 0x3400, end: 0x4dbf, name: "CJK Extension A" },
    { start: 0x3000, end: 0x303f, name: "CJK Punctuation" },
  ],

  // Japanese (Hiragana, Katakana, Kanji)
  japanese: [
    { start: 0x3040, end: 0x309f, name: "Hiragana" },
    { start: 0x30a0, end: 0x30ff, name: "Katakana" },
    { start: 0x4e00, end: 0x9fff, name: "Kanji (CJK)" },
    { start: 0x3000, end: 0x303f, name: "CJK Punctuation" },
  ],

  // Korean (Hangul)
  korean: [
    { start: 0xac00, end: 0xd7af, name: "Hangul Syllables" },
    { start: 0x1100, end: 0x11ff, name: "Hangul Jamo" },
    { start: 0x3130, end: 0x318f, name: "Hangul Compatibility Jamo" },
  ],

  // Cyrillic (Russian, Ukrainian)
  cyrillic: [
    { start: 0x0400, end: 0x04ff, name: "Cyrillic" },
    { start: 0x0500, end: 0x052f, name: "Cyrillic Supplement" },
  ],

  // Greek
  greek: [
    { start: 0x0370, end: 0x03ff, name: "Greek and Coptic" },
    { start: 0x1f00, end: 0x1fff, name: "Greek Extended" },
  ],

  // Hebrew
  hebrew: [
    { start: 0x0590, end: 0x05ff, name: "Hebrew" },
    { start: 0xfb1d, end: 0xfb4f, name: "Hebrew Presentation Forms" },
  ],
};

/**
 * Mapping of locale codes to their primary scripts
 * Each locale may have multiple acceptable scripts (e.g., Latin for proper nouns)
 */
export const LOCALE_TO_SCRIPT: Record<string, { primary: string[]; secondary: string[] }> = {
  // Tier 1 - Core
  en: { primary: ["latin"], secondary: [] },
  ar: { primary: ["arabic"], secondary: ["latin"] },
  hi: { primary: ["devanagari"], secondary: ["latin"] },

  // Tier 2 - High ROI
  zh: { primary: ["cjk"], secondary: ["latin"] },
  ru: { primary: ["cyrillic"], secondary: ["latin"] },
  ur: { primary: ["arabic"], secondary: ["latin"] },
  fr: { primary: ["latin"], secondary: [] },
  id: { primary: ["latin"], secondary: [] },

  // Tier 3 - Growing
  de: { primary: ["latin"], secondary: [] },
  fa: { primary: ["arabic"], secondary: ["latin"] },
  bn: { primary: ["bengali"], secondary: ["latin"] },
  fil: { primary: ["latin"], secondary: [] },
  th: { primary: ["thai"], secondary: ["latin"] },
  vi: { primary: ["latin"], secondary: [] },
  ms: { primary: ["latin"], secondary: [] },

  // Tier 4 - Niche
  es: { primary: ["latin"], secondary: [] },
  tr: { primary: ["latin"], secondary: [] },
  it: { primary: ["latin"], secondary: [] },
  ja: { primary: ["japanese"], secondary: ["latin"] },
  ko: { primary: ["korean"], secondary: ["latin"] },
  he: { primary: ["hebrew"], secondary: ["latin"] },
  pt: { primary: ["latin"], secondary: [] },

  // Tier 5 - European Expansion
  nl: { primary: ["latin"], secondary: [] },
  pl: { primary: ["latin"], secondary: [] },
  sv: { primary: ["latin"], secondary: [] },
  el: { primary: ["greek"], secondary: ["latin"] },
  cs: { primary: ["latin"], secondary: [] },
  ro: { primary: ["latin"], secondary: [] },
  uk: { primary: ["cyrillic"], secondary: ["latin"] },
  hu: { primary: ["latin"], secondary: [] },
};

/**
 * Check if a character code is within a script's unicode ranges
 */
export function isCharInScript(charCode: number, script: string): boolean {
  const ranges = SCRIPT_UNICODE_RANGES[script];
  if (!ranges) return false;

  return ranges.some(range => charCode >= range.start && charCode <= range.end);
}

/**
 * Check if a character is a valid script character for a locale
 */
export function isValidScriptChar(charCode: number, locale: string): boolean {
  const scriptMapping = LOCALE_TO_SCRIPT[locale];
  if (!scriptMapping) return true; // Unknown locale, allow all

  // Check primary scripts
  for (const script of scriptMapping.primary) {
    if (isCharInScript(charCode, script)) return true;
  }

  // Check secondary scripts (for proper nouns, etc.)
  for (const script of scriptMapping.secondary) {
    if (isCharInScript(charCode, script)) return true;
  }

  return false;
}

/**
 * Get the script name for a character code
 */
export function getScriptForChar(charCode: number): string | null {
  for (const [scriptName, ranges] of Object.entries(SCRIPT_UNICODE_RANGES)) {
    if (ranges.some(range => charCode >= range.start && charCode <= range.end)) {
      return scriptName;
    }
  }
  return null;
}

/**
 * Count characters by script in a text
 */
export function countCharsByScript(text: string): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const char of text) {
    const charCode = char.charCodeAt(0);

    // Skip whitespace and common punctuation
    if (/[\s\d.,!?;:'"()\[\]{}<>@#$%^&*+=_~`\\|\/\-]/.test(char)) {
      continue;
    }

    const script = getScriptForChar(charCode);
    if (script) {
      counts[script] = (counts[script] || 0) + 1;
    } else {
      counts["other"] = (counts["other"] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Get primary scripts for a locale
 */
export function getPrimaryScripts(locale: string): string[] {
  return LOCALE_TO_SCRIPT[locale]?.primary || ["latin"];
}

/**
 * Check if locale uses RTL direction
 */
export function isRtlScript(locale: string): boolean {
  const rtlLocales = ["ar", "fa", "ur", "he"];
  return rtlLocales.includes(locale);
}

/**
 * Build regex pattern for script validation
 */
export function buildScriptRegex(script: string): RegExp | null {
  const ranges = SCRIPT_UNICODE_RANGES[script];
  if (!ranges) return null;

  const pattern = ranges
    .map(range => {
      const start = range.start.toString(16).padStart(4, "0");
      const end = range.end.toString(16).padStart(4, "0");
      return `\\u${start}-\\u${end}`;
    })
    .join("");

  return new RegExp(`[${pattern}]`, "g");
}

/**
 * Script regex patterns for quick matching
 */
export const SCRIPT_REGEX: Record<string, RegExp> = {
  latin: /[a-zA-Z\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g,
  arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
  devanagari: /[\u0900-\u097F\uA8E0-\uA8FF]/g,
  bengali: /[\u0980-\u09FF]/g,
  thai: /[\u0E00-\u0E7F]/g,
  cjk: /[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F]/g,
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3000-\u303F]/g,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g,
  cyrillic: /[\u0400-\u04FF\u0500-\u052F]/g,
  greek: /[\u0370-\u03FF\u1F00-\u1FFF]/g,
  hebrew: /[\u0590-\u05FF\uFB1D-\uFB4F]/g,
};

/**
 * Get the appropriate script regex for a locale
 */
export function getScriptRegex(locale: string): RegExp {
  const primaryScripts = getPrimaryScripts(locale);
  const primaryScript = primaryScripts[0];

  if (primaryScript && SCRIPT_REGEX[primaryScript]) {
    return SCRIPT_REGEX[primaryScript];
  }

  return SCRIPT_REGEX.latin;
}
