import { SUPPORTED_LOCALES } from "@shared/schema";

import { apiRequest } from "./queryClient";

export interface GeneratedContent {
  locale: string;
  value: string;
  confidence: number;
}

export interface GenerationResult {
  completed: GeneratedContent[];
  failed: { locale: string; error: string }[];
  pending: string[];
}

export interface GenerationOptions {
  field: string;
  context: Record<string, unknown>;
  targetLanguages?: string[];
  onProgress?: (result: GenerationResult) => void;
}

export function getLocaleInfo(code: string) {
  return SUPPORTED_LOCALES.find(l => l.code === code);
}

export function getLocalesByTier(tier: number) {
  return SUPPORTED_LOCALES.filter(l => l.tier === tier);
}

export function getAllLocaleCodes(): string[] {
  return SUPPORTED_LOCALES.map(l => l.code);
}

export function getTierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return "Tier 1 - Core Markets";
    case 2:
      return "Tier 2 - High ROI";
    case 3:
      return "Tier 3 - Growing Markets";
    case 4:
      return "Tier 4 - Niche Markets";
    case 5:
      return "Tier 5 - European";
    default:
      return `Tier ${tier}`;
  }
}

export async function generateFieldContent(options: GenerationOptions): Promise<GenerationResult> {
  const { field, context, targetLanguages, onProgress } = options;
  const locales = targetLanguages || getAllLocaleCodes();

  const result: GenerationResult = {
    completed: [],
    failed: [],
    pending: [...locales],
  };

  onProgress?.(result);

  for (const locale of locales) {
    try {
      const response = await apiRequest("POST", "/api/ai/generate-field", {
        field,
        context,
        targetLocale: locale,
      });

      const data = await response.json();

      result.completed.push({
        locale,
        value: data.value || data.content || "",
        confidence: data.confidence || 0.85,
      });
    } catch (error) {
      result.failed.push({
        locale,
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }

    result.pending = result.pending.filter(l => l !== locale);
    onProgress?.(result);
  }

  return result;
}

export async function generateFieldContentMock(
  options: GenerationOptions
): Promise<GenerationResult> {
  const { field, targetLanguages, onProgress } = options;
  const locales = targetLanguages || getAllLocaleCodes();

  const result: GenerationResult = {
    completed: [],
    failed: [],
    pending: [...locales],
  };

  onProgress?.(result);

  for (const locale of locales) {
    // NOSONAR: Math.random() used for non-security purpose (simulated delay and mock data generation)
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300)); // NOSONAR

    const localeInfo = getLocaleInfo(locale);

    if (Math.random() > 0.05) {
      // NOSONAR
      result.completed.push({
        locale,
        value: `[${localeInfo?.nativeName || locale}] Generated ${field} content`,
        confidence: 0.75 + Math.random() * 0.25, // NOSONAR
      });
    } else {
      result.failed.push({
        locale,
        error: "API rate limit exceeded",
      });
    }

    result.pending = result.pending.filter(l => l !== locale);
    onProgress?.(result);
  }

  return result;
}

export async function generateContent(
  options: GenerationOptions,
  useMock = false
): Promise<GenerationResult> {
  if (useMock) {
    return generateFieldContentMock(options);
  }
  return generateFieldContent(options);
}
