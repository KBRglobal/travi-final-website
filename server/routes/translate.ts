/**
 * Translation API endpoint
 * POST /api/translate
 *
 * Uses GPT-4o-mini as PRIMARY (100x cheaper than DeepL Pro)
 * DeepL FREE tier available as optional fallback
 */

import { Router, Request, Response } from "express";
// Stub: translation-service deleted in Phase 4.2 cleanup
// Automatic translation is permanently disabled
async function translateText(
  _opts: { text: string; sourceLocale: Locale; targetLocale: Locale; contentType?: string },
  _config?: { provider?: string }
): Promise<{ translatedText: string }> {
  throw new Error(
    "Automatic translation is permanently disabled. Use manual translation in admin UI."
  );
}
import type { Locale } from "@shared/schema";

const router = Router();

// Supported languages
const SUPPORTED_LANGUAGES = [
  "ar",
  "ru",
  "zh",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "ja",
  "ko",
  "tr",
  "nl",
  "hi",
  "he",
  "pl",
  "uk",
  "id",
  "sv",
  "da",
  "fi",
  "nb",
  "el",
  "cs",
  "ro",
  "hu",
  "sk",
  "bg",
  "lt",
  "lv",
  "sl",
  "et",
];

interface TranslateRequest {
  text: string | string[];
  targetLang: string;
  provider?: "claude" | "gpt" | "deepl_free_only";
}

/**
 * POST /api/translate
 * Body: { text: string | string[], targetLang: string, provider?: 'claude' | 'gpt' | 'deepl_free_only' }
 * Returns: { translations: string[] }
 *
 * COST INFO:
 * - Claude Haiku 3.5: ~$1-2 per million characters (DEFAULT - best quality)
 * - GPT-4o-mini: ~$0.22 per million characters (cheapest)
 * - DeepL Free: $0 but 500K chars/month limit
 * - DeepL Pro: $25+/M chars (DISABLED - too expensive!)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { text, targetLang, provider = "claude" } = req.body as TranslateRequest;

    if (!text || !targetLang) {
      return res.status(400).json({ error: "text and targetLang are required" });
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      return res.status(400).json({
        error: `Language ${targetLang} not supported`,
        supported: SUPPORTED_LANGUAGES,
      });
    }

    const texts = Array.isArray(text) ? text : [text];

    // Translate all texts using the translation service
    // Default is GPT-4o-mini which is 100x cheaper than DeepL Pro
    const translations = await Promise.all(
      texts.map(async t => {
        const result = await translateText(
          {
            text: t,
            sourceLocale: "en" as Locale,
            targetLocale: targetLang as Locale,
            contentType: "body",
          },
          { provider: provider as "gpt" | "deepl_free_only" }
        );
        return result.translatedText;
      })
    );

    const costNotes: Record<string, string> = {
      claude: "Using Claude Haiku 3.5 (~$1-2/M chars) - best quality",
      gpt: "Using GPT-4o-mini (~$0.22/M chars) - cheapest",
      deepl_free_only: "Using DeepL Free tier (500K chars/month limit)",
    };

    res.json({
      translations,
      targetLang,
      provider: provider,
      costNote: costNotes[provider] || costNotes.claude,
    });
  } catch {
    res.status(500).json({ error: "Translation failed" });
  }
});

/**
 * GET /api/translate/languages
 * Returns supported languages
 */
router.get("/languages", (req: Request, res: Response) => {
  res.json({
    supported: SUPPORTED_LANGUAGES,
    defaultProvider: "claude",
    providers: {
      claude: {
        name: "Claude Haiku 3.5",
        cost: "~$1-2 per million characters",
        quality: "Excellent - best for nuanced translations",
        default: true,
      },
      gpt: {
        name: "GPT-4o-mini",
        cost: "~$0.22 per million characters",
        quality: "Good - cheapest option",
        default: false,
      },
      deepl_free_only: {
        name: "DeepL Free",
        cost: "$0 (500K chars/month limit)",
        quality: "Excellent - but limited",
        default: false,
      },
    },
    warning: "DeepL Pro is DISABLED - it charged $100 for 4 uses!",
  });
});

/**
 * GET /api/translate/cost-estimate
 * Estimate cost for translation
 */
router.get("/cost-estimate", (req: Request, res: Response) => {
  const charCount = Number.parseInt(req.query.chars as string) || 100000;
  const languages = Number.parseInt(req.query.languages as string) || 17;

  const totalChars = charCount * languages;
  const claudeCost = (totalChars / 1000000) * 1.5; // ~$1.5/M chars average
  const gptCost = (totalChars / 1000000) * 0.22;
  const deeplProCost = (totalChars / 1000000) * 25;

  res.json({
    charCount,
    languages,
    totalChars,
    costs: {
      "claude-haiku": {
        cost: `$${claudeCost.toFixed(2)}`,
        note: "RECOMMENDED - best quality, 15x cheaper than DeepL",
      },
      "gpt-4o-mini": {
        cost: `$${gptCost.toFixed(2)}`,
        note: "Budget option - 100x cheaper than DeepL",
      },
      "deepl-pro": {
        cost: `$${deeplProCost.toFixed(2)}`,
        note: "DISABLED - too expensive!",
      },
    },
    recommendation: "Claude Haiku for quality, GPT-4o-mini for budget",
    savings: `$${(deeplProCost - claudeCost).toFixed(2)} saved by using Claude Haiku`,
  });
});

export default router;
