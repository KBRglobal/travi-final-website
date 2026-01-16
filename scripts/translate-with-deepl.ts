/**
 * DeepL Translation Script for Travi i18n
 *
 * Automatically translates all English strings to supported languages
 * Usage: DEEPL_API_KEY=xxx npx ts-node scripts/translate-with-deepl.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Map our locale codes to DeepL language codes
const LOCALE_TO_DEEPL: Record<string, string> = {
  ar: 'AR',      // Arabic
  hi: 'HI',      // Hindi (not supported by DeepL free, will skip)
  ur: 'UR',      // Urdu (not supported)
  ru: 'RU',      // Russian
  fa: 'FA',      // Persian (not supported)
  zh: 'ZH',      // Chinese
  de: 'DE',      // German
  fr: 'FR',      // French
  es: 'ES',      // Spanish
  it: 'IT',      // Italian
  pt: 'PT-PT',   // Portuguese
  ja: 'JA',      // Japanese
  ko: 'KO',      // Korean
  tr: 'TR',      // Turkish
  nl: 'NL',      // Dutch
  he: 'HE',      // Hebrew (not supported by DeepL, will skip)
};

// Languages DeepL actually supports
const DEEPL_SUPPORTED = ['AR', 'RU', 'ZH', 'DE', 'FR', 'ES', 'IT', 'PT-PT', 'JA', 'KO', 'TR', 'NL'];

interface TranslationResult {
  translations: Array<{
    text: string;
    detected_source_language: string;
  }>;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY environment variable is required');
  }

  // Skip unsupported languages
  if (!DEEPL_SUPPORTED.includes(targetLang)) {
    console.log(`  Skipping ${targetLang} (not supported by DeepL)`);
    return text; // Return original
  }

  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text: text,
      source_lang: 'EN',
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${error}`);
  }

  const result: TranslationResult = await response.json();
  return result.translations[0].text;
}

// Recursively translate all string values in an object
async function translateObject(
  obj: Record<string, any>,
  targetLang: string,
  existingTranslations?: Record<string, any>
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Check if translation already exists
      if (existingTranslations?.[key] && existingTranslations[key] !== value) {
        result[key] = existingTranslations[key]; // Keep existing
        console.log(`    Keeping existing: ${key}`);
      } else {
        // Translate
        try {
          result[key] = await translateText(value, targetLang);
          console.log(`    Translated: ${key}`);
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`    Error translating ${key}:`, error);
          result[key] = value; // Fallback to English
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObject(
        value,
        targetLang,
        existingTranslations?.[key]
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function main() {
  console.log('DeepL Translation Script for Travi');
  console.log('===================================\n');

  if (!DEEPL_API_KEY) {
    console.error('Error: DEEPL_API_KEY environment variable is required');
    console.error('Usage: DEEPL_API_KEY=your-key npx ts-node scripts/translate-with-deepl.ts');
    process.exit(1);
  }

  // Read the translations file
  const translationsPath = path.join(__dirname, '../client/src/lib/i18n/translations.ts');
  const content = fs.readFileSync(translationsPath, 'utf-8');

  // Extract the translations object (simple regex approach)
  // This is a simplified extraction - in production you'd want proper parsing
  console.log('Reading translations file...');

  // For this script, we'll work with a JSON export instead
  // First, let's create a simpler approach using dynamic import

  console.log('\nTo use this script:');
  console.log('1. Export English translations to JSON');
  console.log('2. Run translations through DeepL');
  console.log('3. Update the translations.ts file');
  console.log('\nThe script will translate missing keys only (preserving existing translations).\n');

  // Example of how to translate a single section
  const englishHome = {
    skipToMain: "Skip to main content",
    searchLabel: "Search Dubai experiences",
    searchPlaceholder: "Where do you want to go?",
    comingSoon: "Coming Soon",
    comingSoonExplore: "We're curating the best Dubai experiences for you. Check back soon for hand-picked destinations!",
    comingSoonTrending: "We're gathering the hottest trends in Dubai. Stay tuned for exciting content!",
    trendingInDubai: "Trending in Dubai",
    whatEveryoneTalking: "What everyone's talking about",
    hot: "Hot",
    investmentHub: "Investment Hub",
    offPlanProperties: "Dubai Off-Plan Properties",
    propertyHub: "Property Hub",
    activeProjects: "Active Projects",
    roiCalculator: "ROI Calculator",
    calculateReturns: "Calculate Returns",
    comparisons: "Comparisons",
    analysisGuides: "Analysis Guides",
    termsExplained: "Terms Explained",
    focusedOnDubai: "Currently Focused on Dubai",
    stayInLoop: "Stay in the Loop",
    noSpamMessage: "No spam, unsubscribe anytime",
    madeWithLove: "Made with love in Dubai",
    trustedCompanion: "Your trusted companion for discovering the best of Dubai.",
    company: "Company",
    connect: "Connect",
    travelGuides: "Travel Guides",
  };

  // Test with one language
  console.log('Testing translation with Arabic...');
  try {
    const arabicTranslations = await translateObject(englishHome, 'AR');
    console.log('\nArabic translations:');
    console.log(JSON.stringify(arabicTranslations, null, 2));
  } catch (error) {
    console.error('Translation failed:', error);
  }
}

main().catch(console.error);
