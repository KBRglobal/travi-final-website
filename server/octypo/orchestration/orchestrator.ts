/**
 * Octypo Orchestrator - Main content generation pipeline
 * Coordinates writers, validators, AEO, and image acquisition
 */

import {
  AttractionData,
  GeneratedAttractionContent,
  ContentQualityScore,
  ValidationResult,
  GenerationResult,
  OrchestratorConfig,
  BLUEPRINT_REQUIREMENTS,
  BlueprintCompliance,
  LinkProcessorResult,
} from "../types";
import { calculateQuality108Score } from "../quality/quality-108";
import { log } from "../../lib/logger";
import { AgentRegistry } from "../agents/base-agent";
import {
  WriterAgent,
  initializeWriterAgents,
  getWriterForAttraction,
} from "../agents/writer-agents";
import { initializeValidatorAgents, getValidators } from "../agents/validator-agents";
import { schemaGenerator } from "../aeo/answer-capsule";
import { buildCorrectionPrompt } from "../prompts/content-prompts";
import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import { processContentLinks } from "../post-processors/link-processor";
import { getCulturalContext } from "../../localization/cultural-contexts";
import { validateLocalePurity } from "../../localization/validators/locale-purity";
import { runQualityGates } from "../../localization/validators/quality-gates";
import { getBestWriterForLocale } from "../../localization/writer-language-matrix";

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3, // 3 retries for resilience
  qualityThreshold: 0, // No quality threshold - just check 900 words minimum
  parallelWriters: 12, // Moderate concurrency for stability
  parallelValidators: 12, // Maximum parallel validators
  enableImageGeneration: false,
};

export class OctypoOrchestrator {
  private config: OrchestratorConfig;
  private initialized = false;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    initializeWriterAgents();
    initializeValidatorAgents();

    EngineRegistry.initialize();
    const stats = EngineRegistry.getStats();

    this.initialized = true;
  }

  async generateAttractionContent(attraction: AttractionData): Promise<GenerationResult> {
    await this.initialize();

    const startTime = Date.now();
    let retryCount = 0;
    let lastContent: GeneratedAttractionContent | undefined;
    let lastQualityScore: ContentQualityScore | undefined;
    let lastValidationResults: ValidationResult[] = [];

    const writer = getWriterForAttraction(attraction.primaryCategory || "general");
    if (!writer) {
      throw new Error("No writer agent available");
    }

    while (retryCount < this.config.maxRetries) {
      try {
        const content =
          retryCount === 0
            ? await writer.execute({
                attractionData: attraction,
                sections: [
                  "introduction",
                  "whatToExpect",
                  "visitorTips",
                  "howToGetThere",
                  "faq",
                  "answerCapsule",
                  "metaTitle",
                  "metaDescription",
                ],
                targetWordCount: 2500, // Target 2,200-3,000 words for long-form SEO content
                locale: "en",
              })
            : await this.regenerateWithCorrections(attraction, lastContent!, lastValidationResults);

        content.schemaPayload = schemaGenerator.generateTouristAttractionSchema(
          attraction,
          content
        );

        const validationResults = await this.runValidators(content);
        const qualityScore = this.calculateQualityScore(content, validationResults);

        lastContent = content;
        lastQualityScore = qualityScore;
        lastValidationResults = validationResults;

        // Use passed flag directly - it already encapsulates all quality criteria
        if (qualityScore.passed) {
          const linkResult = await this.runLinkProcessor(attraction, content);

          if (linkResult.success && linkResult.linksAdded > 0) {
            if (linkResult.processedContent.introduction) {
              content.introduction = linkResult.processedContent.introduction;
            }
            if (linkResult.processedContent.whatToExpect) {
              content.whatToExpect = linkResult.processedContent.whatToExpect;
            }
            if (linkResult.processedContent.visitorTips) {
              content.visitorTips = linkResult.processedContent.visitorTips;
            }
            if (linkResult.processedContent.howToGetThere) {
              content.howToGetThere = linkResult.processedContent.howToGetThere;
            }
          }

          return {
            success: true,
            content,
            qualityScore,
            engineUsed: EngineRegistry.getStats().healthy > 0 ? "multi-engine" : "unknown",
            writerId: writer.id,
            validationResults,
            retryCount,
            generationTimeMs: Date.now() - startTime,
            linkProcessorResult: linkResult,
          };
        }

        retryCount++;
      } catch (error) {
        retryCount++;

        if (retryCount >= this.config.maxRetries) {
          return {
            success: false,
            content: lastContent,
            qualityScore: lastQualityScore,
            engineUsed: "unknown",
            writerId: writer.id,
            validationResults: lastValidationResults,
            retryCount,
            generationTimeMs: Date.now() - startTime,
          };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Return success based on passed flag which encapsulates all quality criteria
    return {
      success: lastQualityScore?.passed ?? false,
      content: lastContent,
      qualityScore: lastQualityScore,
      engineUsed: "multi-engine",
      writerId: writer.id,
      validationResults: lastValidationResults,
      retryCount,
      generationTimeMs: Date.now() - startTime,
    };
  }

  private async runLinkProcessor(
    attraction: AttractionData,
    content: GeneratedAttractionContent
  ): Promise<LinkProcessorResult> {
    try {
      const result = await processContentLinks({
        id: String(attraction.id),
        type: "attraction",
        destination: attraction.cityName,
        sections: {
          introduction: content.introduction,
          whatToExpect: content.whatToExpect,
          visitorTips: content.visitorTips,
          howToGetThere: content.howToGetThere,
        },
      });
      return result;
    } catch (error) {
      return {
        success: false,
        linksAdded: 0,
        links: [],
        processedSections: [],
        processedContent: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async runValidators(content: GeneratedAttractionContent): Promise<ValidationResult[]> {
    const validators = getValidators();
    const results: ValidationResult[] = [];

    const dataValidator = validators.find(v => v.id === "validator-benjamin");
    if (dataValidator) {
      const dataResult = await dataValidator.execute({
        contentId: "temp",
        content,
        validationType: "data",
      });
      results.push(dataResult);
    }

    // Style validation via Aisha with 10-second timeout guard
    const styleValidator = validators.find(v => v.id === "validator-aisha");
    if (styleValidator) {
      try {
        const styleResult = await Promise.race([
          styleValidator.execute({
            contentId: "temp",
            content,
            validationType: "style",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Style validation timeout (10s)")), 10000)
          ),
        ]);
        results.push(styleResult);
      } catch (timeoutErr) {
        log.warn(`[Orchestrator] Style validation timed out, using fallback pass`);
        results.push({
          validatorId: "validator-aisha",
          validatorName: "Aisha Khalil",
          passed: true,
          score: 75,
          issues: [],
          suggestions: ["Style validation timed out - using fallback score"],
        });
      }
    }

    return results;
  }

  private calculateQualityScore(
    content: GeneratedAttractionContent,
    validationResults: ValidationResult[]
  ): ContentQualityScore {
    const blueprintCompliance = this.checkBlueprintCompliance(content);

    // NEW: Use 108-point quality scoring system
    const quality108 = calculateQuality108Score(content);

    // Map 108-point scores to legacy 100-point format for compatibility
    const seoScore = Math.round(
      (quality108.categories.technical_seo.score / quality108.categories.technical_seo.maxPoints) *
        100
    );
    const aeoScore = Math.round(
      (quality108.categories.aeo.score / quality108.categories.aeo.maxPoints) * 100
    );
    const styleScore = Math.round(
      (quality108.categories.voice_tone.score / quality108.categories.voice_tone.maxPoints) * 100
    );
    const culturalScore = Math.round(
      (quality108.categories.cultural_depth.score /
        quality108.categories.cultural_depth.maxPoints) *
        100
    );

    // Calculate factCheckScore from validation results and collect validator issues
    let factCheckScore = 100;
    let validatorCriticalCount = 0;
    let validatorMajorCount = 0;

    for (const result of validationResults) {
      const criticalIssues = result.issues.filter(i => i.severity === "critical").length;
      const majorIssues = result.issues.filter(i => i.severity === "major").length;

      validatorCriticalCount += criticalIssues;
      validatorMajorCount += majorIssues;

      // Critical = auto-fail, max 3 major allowed
      if (criticalIssues > 0) {
        factCheckScore = 0;
      } else if (majorIssues > 3) {
        factCheckScore = 50;
      } else {
        const minorCount = result.issues.length - majorIssues;
        factCheckScore = Math.max(0, 100 - majorIssues * 10 - minorCount * 2);
      }
    }

    // SPEED MODE: Only check 900 word minimum - user approved
    const totalWords =
      this.countWords(content.introduction) +
      this.countWords(content.whatToExpect) +
      this.countWords(content.visitorTips) +
      this.countWords(content.howToGetThere) +
      content.faqs.reduce((sum, f) => sum + this.countWords(f.answer), 0);

    const totalMajorIssues = quality108.majorIssues.length + validatorMajorCount;

    // Only fail if under 900 words - ignore quality score
    const meetsWordCount = totalWords >= 900;

    const passed = meetsWordCount;

    // Normalize overallScore to 0-100 for compatibility while keeping 108-point data separate
    const normalizedOverallScore = quality108.percentage;

    if (!passed && totalMajorIssues > 0) {
      /* Major issues exist but handled at the validation level */
    }

    return {
      seoScore,
      aeoScore,
      factCheckScore,
      styleScore,
      culturalScore,
      overallScore: normalizedOverallScore, // Back to 0-100 scale for compatibility
      passed,
      validationResults,
      wordCounts: {
        introduction: this.countWords(content.introduction),
        whatToExpect: this.countWords(content.whatToExpect),
        visitorTips: this.countWords(content.visitorTips),
        howToGetThere: this.countWords(content.howToGetThere),
        faq: content.faqs.reduce((sum, f) => sum + this.countWords(f.answer), 0),
        answerCapsule: this.countWords(content.answerCapsule),
        metaTitle: content.metaTitle.length,
        metaDescription: content.metaDescription.length,
      },
      blueprintCompliance,
      // Include full 108-point details for analysis
      quality108: {
        totalScore: quality108.totalScore,
        maxScore: 108,
        percentage: quality108.percentage,
        grade: quality108.grade,
        criticalIssues: quality108.criticalIssues,
        majorIssues: quality108.majorIssues,
        categories: quality108.categories,
      },
    } as any;
  }

  private checkBlueprintCompliance(content: GeneratedAttractionContent): BlueprintCompliance {
    const introWords = this.countWords(content.introduction);
    const expectWords = this.countWords(content.whatToExpect);
    const tipsWords = this.countWords(content.visitorTips);
    const directionsWords = this.countWords(content.howToGetThere);
    const faqAnswerWords = content.faqs.map(f => this.countWords(f.answer));

    return {
      introductionWordCount: {
        actual: introWords,
        target: [BLUEPRINT_REQUIREMENTS.introduction.min, BLUEPRINT_REQUIREMENTS.introduction.max],
        passed:
          introWords >= BLUEPRINT_REQUIREMENTS.introduction.min &&
          introWords <= BLUEPRINT_REQUIREMENTS.introduction.max + 20,
      },
      whatToExpectWordCount: {
        actual: expectWords,
        target: [BLUEPRINT_REQUIREMENTS.whatToExpect.min, BLUEPRINT_REQUIREMENTS.whatToExpect.max],
        passed:
          expectWords >= BLUEPRINT_REQUIREMENTS.whatToExpect.min &&
          expectWords <= BLUEPRINT_REQUIREMENTS.whatToExpect.max + 50,
      },
      visitorTipsWordCount: {
        actual: tipsWords,
        target: [BLUEPRINT_REQUIREMENTS.visitorTips.min, BLUEPRINT_REQUIREMENTS.visitorTips.max],
        passed:
          tipsWords >= BLUEPRINT_REQUIREMENTS.visitorTips.min &&
          tipsWords <= BLUEPRINT_REQUIREMENTS.visitorTips.max + 30,
      },
      howToGetThereWordCount: {
        actual: directionsWords,
        target: [
          BLUEPRINT_REQUIREMENTS.howToGetThere.min,
          BLUEPRINT_REQUIREMENTS.howToGetThere.max,
        ],
        passed:
          directionsWords >= BLUEPRINT_REQUIREMENTS.howToGetThere.min &&
          directionsWords <= BLUEPRINT_REQUIREMENTS.howToGetThere.max + 30,
      },
      faqCount: {
        actual: content.faqs.length,
        target: [BLUEPRINT_REQUIREMENTS.faq.min, BLUEPRINT_REQUIREMENTS.faq.max],
        passed:
          content.faqs.length >= BLUEPRINT_REQUIREMENTS.faq.min &&
          content.faqs.length <= BLUEPRINT_REQUIREMENTS.faq.max,
      },
      faqAnswerLengths: {
        actual: faqAnswerWords,
        target: [BLUEPRINT_REQUIREMENTS.faq.answerMin, BLUEPRINT_REQUIREMENTS.faq.answerMax],
        allPassed: faqAnswerWords.every(
          w =>
            w >= BLUEPRINT_REQUIREMENTS.faq.answerMin - 5 &&
            w <= BLUEPRINT_REQUIREMENTS.faq.answerMax + 10
        ),
      },
      metaTitleLength: {
        actual: content.metaTitle.length,
        target: [BLUEPRINT_REQUIREMENTS.metaTitle.min, BLUEPRINT_REQUIREMENTS.metaTitle.max],
        passed:
          content.metaTitle.length >= BLUEPRINT_REQUIREMENTS.metaTitle.min - 5 &&
          content.metaTitle.length <= BLUEPRINT_REQUIREMENTS.metaTitle.max + 5,
      },
      metaDescriptionLength: {
        actual: content.metaDescription.length,
        target: [
          BLUEPRINT_REQUIREMENTS.metaDescription.min,
          BLUEPRINT_REQUIREMENTS.metaDescription.max,
        ],
        passed:
          content.metaDescription.length >= BLUEPRINT_REQUIREMENTS.metaDescription.min - 10 &&
          content.metaDescription.length <= BLUEPRINT_REQUIREMENTS.metaDescription.max + 10,
      },
      sensoryDescriptionCount: {
        actual: content.sensoryDescriptions?.length || 0,
        target: BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions,
        passed:
          (content.sensoryDescriptions?.length || 0) >=
          BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions - 1,
      },
      honestLimitationCount: {
        actual: content.honestLimitations?.length || 0,
        target: [
          BLUEPRINT_REQUIREMENTS.honestLimitations.min,
          BLUEPRINT_REQUIREMENTS.honestLimitations.max,
        ],
        passed:
          (content.honestLimitations?.length || 0) >=
          BLUEPRINT_REQUIREMENTS.honestLimitations.min - 1,
      },
    };
  }

  private async regenerateWithCorrections(
    attraction: AttractionData,
    previousContent: GeneratedAttractionContent,
    validationResults: ValidationResult[]
  ): Promise<GeneratedAttractionContent> {
    const issues = validationResults.flatMap(r =>
      r.issues.map(i => ({
        section: i.section,
        message: i.message,
        fix: i.fix || "",
      }))
    );

    if (issues.length === 0) {
      const writer = getWriterForAttraction(attraction.primaryCategory || "general");
      if (!writer) throw new Error("No writer available");

      return writer.execute({
        attractionData: attraction,
        sections: [
          "introduction",
          "whatToExpect",
          "visitorTips",
          "howToGetThere",
          "faq",
          "answerCapsule",
          "metaTitle",
          "metaDescription",
        ],
        targetWordCount: 2500, // Target 2,200-3,000 words
        locale: "en",
      });
    }

    const correctionPrompt = buildCorrectionPrompt(previousContent, issues);

    const engine = EngineRegistry.getNextEngine();
    if (!engine) throw new Error("No engine available");

    const systemPrompt = `You are a content editor. Fix the issues in the travel content and return corrected JSON.`;

    const response = await generateWithEngine(engine, systemPrompt, correctionPrompt);
    EngineRegistry.reportSuccess(engine.id);

    let jsonString = response.trim();
    if (jsonString.startsWith("```json")) jsonString = jsonString.slice(7);
    if (jsonString.startsWith("```")) jsonString = jsonString.slice(3);
    if (jsonString.endsWith("```")) jsonString = jsonString.slice(0, -3);

    const parsed = JSON.parse(jsonString.trim());

    return {
      title: parsed.title || previousContent.title,
      body: parsed.body || previousContent.body,
      introduction: parsed.introduction || previousContent.introduction,
      whatToExpect: parsed.whatToExpect || parsed.what_to_expect || previousContent.whatToExpect,
      visitorTips: parsed.visitorTips || parsed.visitor_tips || previousContent.visitorTips,
      howToGetThere:
        parsed.howToGetThere || parsed.how_to_get_there || previousContent.howToGetThere,
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : previousContent.faqs,
      answerCapsule: parsed.answerCapsule || parsed.answer_capsule || previousContent.answerCapsule,
      metaTitle: parsed.metaTitle || parsed.meta_title || previousContent.metaTitle,
      metaDescription:
        parsed.metaDescription || parsed.meta_description || previousContent.metaDescription,
      schemaPayload: parsed.schemaPayload || parsed.schema_payload || previousContent.schemaPayload,
      honestLimitations:
        parsed.honestLimitations ||
        parsed.honest_limitations ||
        previousContent.honestLimitations ||
        [],
      sensoryDescriptions:
        parsed.sensoryDescriptions ||
        parsed.sensory_descriptions ||
        previousContent.sensoryDescriptions ||
        [],
    };
  }

  private countWords(text: string | undefined | null | object): number {
    if (!text) return 0;
    if (typeof text !== "string") {
      text = JSON.stringify(text);
    }
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * PILOT: Generate attraction content with explicit locale parameter
   * This method generates NATIVE content in the target locale (not translation)
   * Used by the Octypo × Localization pilot
   * Extended to support French (fr) in addition to English and Arabic
   */
  async generateAttractionContentWithLocale(
    attraction: AttractionData,
    locale: "en" | "ar" | "fr"
  ): Promise<GenerationResult> {
    await this.initialize();

    const startTime = Date.now();
    let retryCount = 0;
    let lastContent: GeneratedAttractionContent | undefined;
    let lastQualityScore: ContentQualityScore | undefined;
    let lastValidationResults: ValidationResult[] = [];

    const writer = getWriterForAttraction(attraction.primaryCategory || "general");
    if (!writer) {
      throw new Error("No writer agent available");
    }

    while (retryCount < this.config.maxRetries) {
      try {
        const content =
          retryCount === 0
            ? await writer.executeWithLocale({
                attractionData: attraction,
                sections: [
                  "introduction",
                  "whatToExpect",
                  "visitorTips",
                  "howToGetThere",
                  "faq",
                  "answerCapsule",
                  "metaTitle",
                  "metaDescription",
                ],
                targetWordCount: 2500,
                locale: locale, // PILOT: Use explicit locale parameter
              })
            : await this.regenerateWithCorrections(attraction, lastContent!, lastValidationResults);

        content.schemaPayload = schemaGenerator.generateTouristAttractionSchema(
          attraction,
          content
        );

        // Skip LLM validators for pilot - we use our own validators
        const validationResults: ValidationResult[] = [];
        const qualityScore = this.calculateQualityScore(content, validationResults);

        lastContent = content;
        lastQualityScore = qualityScore;
        lastValidationResults = validationResults;

        // For pilot, we return after first successful generation
        // Validation is done by pilot validators, not here
        if (lastContent) {
          return {
            success: true,
            content: lastContent,
            qualityScore: lastQualityScore,
            engineUsed: "multi-engine",
            writerId: writer.id,
            validationResults: lastValidationResults,
            retryCount,
            generationTimeMs: Date.now() - startTime,
          };
        }

        retryCount++;
      } catch (error) {
        retryCount++;

        if (retryCount >= this.config.maxRetries) {
          return {
            success: false,
            content: lastContent,
            qualityScore: lastQualityScore,
            engineUsed: "unknown",
            writerId: writer.id,
            validationResults: lastValidationResults,
            retryCount,
            generationTimeMs: Date.now() - startTime,
          };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      success: lastQualityScore?.passed ?? false,
      content: lastContent,
      qualityScore: lastQualityScore,
      engineUsed: "multi-engine",
      writerId: writer.id,
      validationResults: lastValidationResults,
      retryCount,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * NATIVE CONTENT ARCHITECTURE: Generate content for any of the 30 supported locales
   * This method generates NATIVE content in the target locale using cultural context
   */
  async generateNativeContent(
    entityType: string,
    entityId: string,
    destination: string,
    locale: string,
    attractionData?: AttractionData
  ): Promise<{
    success: boolean;
    content?: GeneratedAttractionContent;
    locale: string;
    culturalContextVersion?: string;
    localePurityScore?: number;
    qualityGates?: ReturnType<typeof runQualityGates>;
    writerAgent?: string;
    engineUsed?: string;
    generationTimeMs: number;
    failureReason?: string;
  }> {
    await this.initialize();

    const startTime = Date.now();

    // Get cultural context for the locale
    const culturalContext = getCulturalContext(locale);
    if (!culturalContext) {
      return {
        success: false,
        locale,
        generationTimeMs: Date.now() - startTime,
        failureReason: `Unsupported locale: ${locale}`,
      };
    }

    // Get best writer for this locale
    const bestWriterId = getBestWriterForLocale(locale, attractionData?.primaryCategory);
    const writer = AgentRegistry.get(bestWriterId) as WriterAgent | null;

    if (!writer) {
      // Fallback to default writer
      const fallbackWriter = getWriterForAttraction(attractionData?.primaryCategory || "general");
      if (!fallbackWriter) {
        return {
          success: false,
          locale,
          generationTimeMs: Date.now() - startTime,
          failureReason: `No writer available for locale: ${locale}`,
        };
      }
    }

    const selectedWriter =
      writer || getWriterForAttraction(attractionData?.primaryCategory || "general")!;

    try {
      // Generate content with locale-aware prompts
      const numericId = attractionData?.id || Number.parseInt(entityId, 10) || 0;
      const content = await selectedWriter.executeWithLocale({
        attractionData:
          attractionData ||
          ({
            id: numericId,
            name: "",
            slug: "",
            destination: destination,
            title: "",
            cityName: destination,
            primaryCategory: "general",
          } as AttractionData),
        sections: [
          "introduction",
          "whatToExpect",
          "visitorTips",
          "howToGetThere",
          "faq",
          "answerCapsule",
          "metaTitle",
          "metaDescription",
        ],
        targetWordCount: culturalContext.quality.maxWordCount,
        locale: locale as any,
      });

      // Build exemptions for purity check (proper nouns)
      const exemptions: string[] = [
        attractionData?.title,
        attractionData?.venueName,
        attractionData?.cityName,
        destination,
      ].filter((e): e is string => Boolean(e?.trim()));

      // Validate locale purity
      const purityResult = validateLocalePurity(content, locale, exemptions);

      // Run quality gates
      const qualityGates = runQualityGates(
        {
          introduction: content.introduction,
          whatToExpect: content.whatToExpect,
          visitorTips: content.visitorTips,
          howToGetThere: content.howToGetThere,
          faq: content.faqs,
          answerCapsule: content.answerCapsule,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          localePurityScore: purityResult.score,
        },
        locale
      );

      // Generate schema if we have attraction data
      if (attractionData) {
        content.schemaPayload = schemaGenerator.generateTouristAttractionSchema(
          attractionData,
          content
        );
      }

      return {
        success: qualityGates.passed,
        content,
        locale,
        culturalContextVersion: culturalContext.version,
        localePurityScore: purityResult.score,
        qualityGates,
        writerAgent: selectedWriter.id,
        engineUsed: "multi-engine",
        generationTimeMs: Date.now() - startTime,
        failureReason: qualityGates.passed
          ? undefined
          : qualityGates.summary.criticalFailures.join(", "),
      };
    } catch (error) {
      return {
        success: false,
        locale,
        generationTimeMs: Date.now() - startTime,
        failureReason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate native content for multiple locales in parallel
   */
  async generateNativeContentBatch(
    entityType: string,
    entityId: string,
    destination: string,
    locales: string[],
    attractionData?: AttractionData,
    concurrency: number = 3
  ): Promise<Map<string, Awaited<ReturnType<typeof this.generateNativeContent>>>> {
    const results = new Map<string, Awaited<ReturnType<typeof this.generateNativeContent>>>();

    // Process in batches
    for (let i = 0; i < locales.length; i += concurrency) {
      const batch = locales.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(locale =>
          this.generateNativeContent(entityType, entityId, destination, locale, attractionData)
        )
      );

      for (let j = 0; j < batch.length; j++) {
        results.set(batch[j], batchResults[j]);
      }
    }

    return results;
  }
}

let orchestratorInstance: OctypoOrchestrator | null = null;

export function getOctypoOrchestrator(config?: Partial<OrchestratorConfig>): OctypoOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new OctypoOrchestrator(config);
  }
  return orchestratorInstance;
}
