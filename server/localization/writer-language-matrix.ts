/**
 * Writer-Language Matrix
 * ======================
 * Defines which writer agents support which languages
 * Used for routing content generation to appropriate writers
 */

/**
 * Writer language capabilities
 */
export interface WriterLanguageCapability {
  /** Primary languages - writer is highly proficient */
  primary: string[];
  /** Secondary languages - writer can handle with good quality */
  secondary: string[];
  /** Specialties (e.g., luxury, adventure, food) */
  specialties: string[];
}

/**
 * Writer language matrix
 * Maps writer IDs to their language capabilities
 */
export const WRITER_LANGUAGE_MATRIX: Record<string, WriterLanguageCapability> = {
  // Existing writers from writer-agents.ts with expanded language support

  "writer-sarah": {
    primary: ["en", "fr"],
    secondary: ["de", "es", "it", "pt"],
    specialties: ["luxury", "cultural", "fine-dining"],
  },

  "writer-omar": {
    primary: ["ar", "en"],
    secondary: ["fa", "ur", "tr"],
    specialties: ["adventure", "outdoor", "desert"],
  },

  "writer-fatima": {
    primary: ["ar", "en", "fr"],
    secondary: ["tr"],
    specialties: ["food", "culinary", "cultural"],
  },

  "writer-michael": {
    primary: ["en", "zh"],
    secondary: ["ja", "ko"],
    specialties: ["business", "tech", "urban"],
  },

  "writer-rebecca": {
    primary: ["en"],
    secondary: ["de", "nl", "sv"],
    specialties: ["family", "accessibility", "kids"],
  },

  "writer-ahmed": {
    primary: ["ar", "en"],
    secondary: ["tr", "fa", "he"],
    specialties: ["heritage", "history", "architecture"],
  },

  "writer-david": {
    primary: ["en", "es", "pt"],
    secondary: ["it"],
    specialties: ["budget", "backpacker", "street-food"],
  },

  "writer-layla": {
    primary: ["en", "ar"],
    secondary: ["fr", "de"],
    specialties: ["eco", "sustainable", "nature"],
  },

  // New virtual writers for expanded language coverage

  "writer-yuki": {
    primary: ["ja", "en"],
    secondary: ["zh", "ko"],
    specialties: ["cultural", "traditional", "modern"],
  },

  "writer-priya": {
    primary: ["hi", "bn", "en"],
    secondary: ["ur"],
    specialties: ["family", "cultural", "food"],
  },

  "writer-mei": {
    primary: ["th", "vi", "en"],
    secondary: ["id", "ms", "fil"],
    specialties: ["adventure", "food", "beach"],
  },

  "writer-anna": {
    primary: ["ru", "uk", "en"],
    secondary: ["pl", "cs"],
    specialties: ["cultural", "history", "luxury"],
  },

  "writer-hans": {
    primary: ["de", "en"],
    secondary: ["nl", "sv", "pl"],
    specialties: ["efficiency", "culture", "outdoor"],
  },

  "writer-sofia": {
    primary: ["el", "en"],
    secondary: ["ro", "hu"],
    specialties: ["history", "cultural", "food"],
  },

  "writer-ali": {
    primary: ["fa", "en"],
    secondary: ["ar", "ur"],
    specialties: ["cultural", "history", "family"],
  },
};

/**
 * Get best writer for a locale and category
 */
export function getBestWriterForLocale(locale: string, category?: string): string | null {
  // First, try to find a writer with this locale as primary
  const primaryWriters = Object.entries(WRITER_LANGUAGE_MATRIX)
    .filter(([_, cap]) => cap.primary.includes(locale))
    .map(([id, cap]) => ({ id, cap, priority: 1 }));

  // Then, try secondary
  const secondaryWriters = Object.entries(WRITER_LANGUAGE_MATRIX)
    .filter(([_, cap]) => cap.secondary.includes(locale))
    .map(([id, cap]) => ({ id, cap, priority: 2 }));

  const allWriters = [...primaryWriters, ...secondaryWriters];

  if (allWriters.length === 0) {
    // Fallback to English writers for unsupported locales
    return "writer-sarah";
  }

  // If category specified, prefer writers with matching specialty
  if (category) {
    const normalizedCategory = category.toLowerCase();
    const specialtyMatch = allWriters.find(w =>
      w.cap.specialties.some(s => normalizedCategory.includes(s))
    );
    if (specialtyMatch) {
      return specialtyMatch.id;
    }
  }

  // Return highest priority (lowest number) writer
  return allWriters.sort((a, b) => a.priority - b.priority)[0].id;
}

/**
 * Get all writers that support a locale
 */
export function getWritersForLocale(locale: string): {
  primary: string[];
  secondary: string[];
} {
  const primary: string[] = [];
  const secondary: string[] = [];

  for (const [writerId, cap] of Object.entries(WRITER_LANGUAGE_MATRIX)) {
    if (cap.primary.includes(locale)) {
      primary.push(writerId);
    } else if (cap.secondary.includes(locale)) {
      secondary.push(writerId);
    }
  }

  return { primary, secondary };
}

/**
 * Get all locales a writer supports
 */
export function getLocalesForWriter(writerId: string): {
  primary: string[];
  secondary: string[];
  all: string[];
} {
  const cap = WRITER_LANGUAGE_MATRIX[writerId];
  if (!cap) {
    return { primary: [], secondary: [], all: [] };
  }

  return {
    primary: cap.primary,
    secondary: cap.secondary,
    all: [...cap.primary, ...cap.secondary],
  };
}

/**
 * Check if a writer supports a locale
 */
export function writerSupportsLocale(
  writerId: string,
  locale: string
): { supports: boolean; level: "primary" | "secondary" | "none" } {
  const cap = WRITER_LANGUAGE_MATRIX[writerId];
  if (!cap) {
    return { supports: false, level: "none" };
  }

  if (cap.primary.includes(locale)) {
    return { supports: true, level: "primary" };
  }

  if (cap.secondary.includes(locale)) {
    return { supports: true, level: "secondary" };
  }

  return { supports: false, level: "none" };
}

/**
 * Get coverage statistics for all locales
 */
export function getLocaleCoverage(): Record<
  string,
  { primaryWriters: number; secondaryWriters: number; total: number }
> {
  const ALL_LOCALES = [
    "en",
    "ar",
    "hi",
    "zh",
    "ru",
    "ur",
    "fr",
    "id",
    "de",
    "fa",
    "bn",
    "fil",
    "th",
    "vi",
    "ms",
    "es",
    "tr",
    "it",
    "ja",
    "ko",
    "he",
    "pt",
    "nl",
    "pl",
    "sv",
    "el",
    "cs",
    "ro",
    "uk",
    "hu",
  ];

  const coverage: Record<
    string,
    { primaryWriters: number; secondaryWriters: number; total: number }
  > = {};

  for (const locale of ALL_LOCALES) {
    const writers = getWritersForLocale(locale);
    coverage[locale] = {
      primaryWriters: writers.primary.length,
      secondaryWriters: writers.secondary.length,
      total: writers.primary.length + writers.secondary.length,
    };
  }

  return coverage;
}

/**
 * Get locales without any writer coverage
 */
export function getUncoveredLocales(): string[] {
  const coverage = getLocaleCoverage();
  return Object.entries(coverage)
    .filter(([_, stats]) => stats.total === 0)
    .map(([locale]) => locale);
}

/**
 * Writer pool for load balancing
 */
export function getWriterPool(locale: string): string[] {
  const writers = getWritersForLocale(locale);

  // Prioritize primary writers (3x), then secondary (1x)
  const pool: string[] = [];

  for (const writerId of writers.primary) {
    pool.push(writerId, writerId, writerId); // 3x weight
  }

  for (const writerId of writers.secondary) {
    pool.push(writerId); // 1x weight
  }

  // If no coverage, add English writers as fallback
  if (pool.length === 0) {
    const englishWriters = getWritersForLocale("en");
    pool.push(...englishWriters.primary);
  }

  return pool;
}

/**
 * Select random writer from pool (for load balancing)
 */
export function selectRandomWriter(locale: string): string {
  const pool = getWriterPool(locale);
  if (pool.length === 0) {
    return "writer-sarah"; // Ultimate fallback
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export default {
  WRITER_LANGUAGE_MATRIX,
  getBestWriterForLocale,
  getWritersForLocale,
  getLocalesForWriter,
  writerSupportsLocale,
  getLocaleCoverage,
  getUncoveredLocales,
  getWriterPool,
  selectRandomWriter,
};
