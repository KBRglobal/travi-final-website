/**
 * Validator Agents - 6 specialized content validators
 * Ported from octypo-main Python patterns
 */

import { BaseAgent, AgentRegistry } from "./base-agent";
import {
  AgentPersona,
  ValidationTask,
  ValidationResult,
  ValidationIssue,
  GeneratedAttractionContent,
  BLUEPRINT_REQUIREMENTS,
} from "../types";

const VALIDATOR_PERSONAS: AgentPersona[] = [
  {
    id: "validator-james",
    name: "James Walker",
    specialty: "Fact Checking & Accuracy",
    tone: "Meticulous and thorough",
    expertise: ["fact verification", "data accuracy", "source validation", "claims verification"],
    systemPrompt: `You are James Walker, a veteran fact-checker with 20 years at major news organizations. Your job is to identify any factual claims that may be inaccurate, misleading, or unverifiable. Flag specific claims with their issues. Be particularly careful about: prices, distances, opening hours, historical dates, and capacity numbers.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "validator-benjamin",
    name: "Benjamin Cole",
    specialty: "Data & Technical Validation",
    tone: "Precise and systematic",
    expertise: ["word counts", "structure validation", "schema validation", "format checking"],
    systemPrompt: `You are Benjamin Cole, a technical editor specializing in content structure and data validation. Your job is to verify that content meets all technical requirements: word counts, section structure, JSON schema validity, and formatting standards. You count words precisely and check every structural requirement.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "validator-grace",
    name: "Grace Anderson",
    specialty: "Legal & Copyright Compliance",
    tone: "Careful and protective",
    expertise: ["copyright", "trademark", "defamation", "liability", "affiliate compliance"],
    systemPrompt: `You are Grace Anderson, a media lawyer specializing in travel content. Your job is to identify potential legal issues: copyright concerns, trademark usage, defamatory statements, misleading claims that could create liability, and affiliate disclosure compliance. Flag anything that could expose the publisher to legal risk.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "validator-aisha",
    name: "Aisha Khalil",
    specialty: "Style & Tone Validation",
    tone: "Discerning and constructive",
    expertise: ["writing quality", "tone consistency", "AI pattern detection", "engagement"],
    systemPrompt: `You are Aisha Khalil, an editorial director with expertise in travel writing. Your job is to ensure content reads naturally, maintains consistent tone, and avoids AI-typical patterns. Flag: overused phrases, robotic transitions, inconsistent voice, and content that feels generic rather than specific. Look for sensory details and authentic local knowledge.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "validator-hassan",
    name: "Hassan Mahmoud",
    specialty: "Cultural Sensitivity",
    tone: "Respectful and knowledgeable",
    expertise: ["cultural accuracy", "religious sensitivity", "local customs", "representation"],
    systemPrompt: `You are Hassan Mahmoud, a cultural consultant with expertise in Middle Eastern, Asian, and global cultures. Your job is to ensure content is culturally sensitive, accurate in its cultural references, and respectful of local customs and religious practices. Flag stereotypes, misrepresentations, and potentially offensive content.`,
    preferredEngines: ["anthropic", "openai"],
  },
  {
    id: "validator-chris",
    name: "Christopher Davis",
    specialty: "Safety & Accessibility",
    tone: "Protective and thorough",
    expertise: [
      "safety warnings",
      "accessibility info",
      "health considerations",
      "travel advisories",
    ],
    systemPrompt: `You are Christopher Davis, a safety consultant specializing in travel. Your job is to ensure content includes appropriate safety information, accessibility details, and health considerations. Flag missing safety warnings, unclear accessibility information, and content that could put travelers at risk.`,
    preferredEngines: ["anthropic", "openai"],
  },
];

export class ValidatorAgent extends BaseAgent {
  constructor(persona: AgentPersona) {
    super(persona);
  }

  async execute(task: ValidationTask): Promise<ValidationResult> {
    this.log(`Starting ${this.specialty} validation`);

    if (this.persona.id === "validator-benjamin") {
      return this.performDataValidation(task.content);
    }

    return this.performLLMValidation(task);
  }

  private performDataValidation(content: GeneratedAttractionContent): ValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    const introWords = this.countWords(content.introduction);
    if (introWords < BLUEPRINT_REQUIREMENTS.introduction.min) {
      issues.push({
        severity: "major",
        section: "introduction",
        message: `Introduction too short: ${introWords} words (need ${BLUEPRINT_REQUIREMENTS.introduction.min}-${BLUEPRINT_REQUIREMENTS.introduction.max})`,
        fix: `Add ${BLUEPRINT_REQUIREMENTS.introduction.min - introWords} more words to introduction`,
      });
    } else if (introWords > BLUEPRINT_REQUIREMENTS.introduction.max) {
      issues.push({
        severity: "minor",
        section: "introduction",
        message: `Introduction too long: ${introWords} words (target ${BLUEPRINT_REQUIREMENTS.introduction.min}-${BLUEPRINT_REQUIREMENTS.introduction.max})`,
        fix: `Remove ${introWords - BLUEPRINT_REQUIREMENTS.introduction.max} words from introduction`,
      });
    }

    const expectWords = this.countWords(content.whatToExpect);
    if (expectWords < BLUEPRINT_REQUIREMENTS.whatToExpect.min) {
      issues.push({
        severity: "major",
        section: "whatToExpect",
        message: `What to Expect too short: ${expectWords} words (need ${BLUEPRINT_REQUIREMENTS.whatToExpect.min}-${BLUEPRINT_REQUIREMENTS.whatToExpect.max})`,
        fix: `Add ${BLUEPRINT_REQUIREMENTS.whatToExpect.min - expectWords} more words with sensory details`,
      });
    }

    const tipsWords = this.countWords(content.visitorTips);
    if (tipsWords < BLUEPRINT_REQUIREMENTS.visitorTips.min) {
      issues.push({
        severity: "major",
        section: "visitorTips",
        message: `Visitor Tips too short: ${tipsWords} words (need ${BLUEPRINT_REQUIREMENTS.visitorTips.min}-${BLUEPRINT_REQUIREMENTS.visitorTips.max})`,
        fix: `Add more visitor tips with Best Time/Pro Tips/Save Money sections`,
      });
    }

    const directionsWords = this.countWords(content.howToGetThere);
    if (directionsWords < BLUEPRINT_REQUIREMENTS.howToGetThere.min) {
      issues.push({
        severity: "major",
        section: "howToGetThere",
        message: `How to Get There too short: ${directionsWords} words (need ${BLUEPRINT_REQUIREMENTS.howToGetThere.min}-${BLUEPRINT_REQUIREMENTS.howToGetThere.max})`,
        fix: `Add Metro/Taxi/Car options with specific prices`,
      });
    }

    const faqCount = content.faqs.length;
    if (faqCount < BLUEPRINT_REQUIREMENTS.faq.min) {
      issues.push({
        severity: "major", // Changed from critical to major - more lenient
        section: "faq",
        message: `Not enough FAQs: ${faqCount} (need ${BLUEPRINT_REQUIREMENTS.faq.min}-${BLUEPRINT_REQUIREMENTS.faq.max})`,
        fix: `Add ${BLUEPRINT_REQUIREMENTS.faq.min - faqCount} more FAQ questions`,
      });
    }

    for (let i = 0; i < content.faqs.length; i++) {
      const faq = content.faqs[i];
      const answerWords = this.countWords(faq.answer);
      if (answerWords < BLUEPRINT_REQUIREMENTS.faq.answerMin) {
        issues.push({
          severity: "major",
          section: "faq",
          message: `FAQ ${i + 1} answer too short: ${answerWords} words (need ${BLUEPRINT_REQUIREMENTS.faq.answerMin}-${BLUEPRINT_REQUIREMENTS.faq.answerMax})`,
          fix: `Expand FAQ answer to ${BLUEPRINT_REQUIREMENTS.faq.answerMin} words using Answer Capsule method`,
        });
      } else if (answerWords > BLUEPRINT_REQUIREMENTS.faq.answerMax) {
        issues.push({
          severity: "minor",
          section: "faq",
          message: `FAQ ${i + 1} answer too long: ${answerWords} words (target ${BLUEPRINT_REQUIREMENTS.faq.answerMin}-${BLUEPRINT_REQUIREMENTS.faq.answerMax})`,
          fix: `Trim FAQ answer to ${BLUEPRINT_REQUIREMENTS.faq.answerMax} words`,
        });
      }
    }

    const titleLength = content.metaTitle.length;
    if (
      titleLength < BLUEPRINT_REQUIREMENTS.metaTitle.min ||
      titleLength > BLUEPRINT_REQUIREMENTS.metaTitle.max
    ) {
      issues.push({
        severity: "major",
        section: "metaTitle",
        message: `Meta title wrong length: ${titleLength} chars (need ${BLUEPRINT_REQUIREMENTS.metaTitle.min}-${BLUEPRINT_REQUIREMENTS.metaTitle.max})`,
        fix:
          titleLength < BLUEPRINT_REQUIREMENTS.metaTitle.min
            ? "Add year and price to meta title"
            : "Shorten meta title",
      });
    }

    const descLength = content.metaDescription.length;
    if (
      descLength < BLUEPRINT_REQUIREMENTS.metaDescription.min ||
      descLength > BLUEPRINT_REQUIREMENTS.metaDescription.max
    ) {
      issues.push({
        severity: "major",
        section: "metaDescription",
        message: `Meta description wrong length: ${descLength} chars (need ${BLUEPRINT_REQUIREMENTS.metaDescription.min}-${BLUEPRINT_REQUIREMENTS.metaDescription.max})`,
        fix:
          descLength < BLUEPRINT_REQUIREMENTS.metaDescription.min
            ? "Add CTA to meta description"
            : "Shorten meta description",
      });
    }

    const limitationCount = content.honestLimitations?.length || 0;
    if (limitationCount < BLUEPRINT_REQUIREMENTS.honestLimitations.min) {
      issues.push({
        severity: "major",
        section: "overall",
        message: `Not enough honest limitations: ${limitationCount} (need ${BLUEPRINT_REQUIREMENTS.honestLimitations.min}-${BLUEPRINT_REQUIREMENTS.honestLimitations.max})`,
        fix: "Add honest limitations about crowds, costs, or accessibility",
      });
    }

    const sensoryCount = content.sensoryDescriptions?.length || 0;
    if (sensoryCount < BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions) {
      issues.push({
        severity: "major",
        section: "whatToExpect",
        message: `Not enough sensory descriptions: ${sensoryCount} (need ${BLUEPRINT_REQUIREMENTS.whatToExpect.sensoryDescriptions}+)`,
        fix: "Add sensory details (what you see, hear, smell, feel)",
      });
    }

    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const majorCount = issues.filter(i => i.severity === "major").length;
    const minorCount = issues.filter(i => i.severity === "minor").length;

    // NEW: Simplified scoring - only major/minor matter, no double penalties
    // Critical = auto-fail (score 0)
    // Major = -10 points each
    // Minor = -2 points each
    let score: number;
    if (criticalCount > 0) {
      score = 0; // Critical = auto-fail
    } else if (majorCount > 3) {
      score = 50; // Too many major issues
    } else {
      score = Math.max(0, 100 - majorCount * 10 - minorCount * 2);
    }

    return {
      validatorId: this.persona.id,
      validatorName: this.persona.name,
      passed: criticalCount === 0 && majorCount <= 3 && score >= 70, // Max 3 major allowed
      score,
      issues,
      suggestions,
    };
  }

  private async performLLMValidation(task: ValidationTask): Promise<ValidationResult> {
    const systemPrompt =
      this.persona.systemPrompt +
      `

OUTPUT FORMAT (JSON only):
{
  "passed": true/false,
  "score": 0-100,
  "issues": [
    {"severity": "critical/major/minor", "section": "section_name", "message": "issue description", "fix": "how to fix"}
  ],
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
}`;

    const userPrompt = `Validate this travel content for ${this.specialty}:

CONTENT TO VALIDATE:
${JSON.stringify(task.content, null, 2)}

Analyze for issues related to your specialty and return JSON response.`;

    try {
      const response = await this.callLLM(systemPrompt, userPrompt);
      let jsonString = response.trim();

      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith("```")) {
        jsonString = jsonString.slice(0, -3);
      }

      const parsed = JSON.parse(jsonString.trim());

      return {
        validatorId: this.persona.id,
        validatorName: this.persona.name,
        passed: parsed.passed ?? true,
        score: parsed.score ?? 85,
        issues: parsed.issues ?? [],
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      this.log(`Validation error - HARD FAILURE: ${error}`);
      // STRICT: Validation error = FAILURE - NO FALLBACK SCORES
      return {
        validatorId: this.persona.id,
        validatorName: this.persona.name,
        passed: false,
        score: 0,
        issues: [
          {
            severity: "critical",
            section: "overall",
            message: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            fix: "Regenerate content with different engine",
          },
        ],
        suggestions: ["Validation error - content must be regenerated"],
      };
    }
  }

  private countWords(text: string | undefined | null | object): number {
    if (!text) return 0;
    if (typeof text !== "string") {
      // Handle objects/arrays by converting to string first
      text = JSON.stringify(text);
    }
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
}

export function initializeValidatorAgents(): void {
  for (const persona of VALIDATOR_PERSONAS) {
    const agent = new ValidatorAgent(persona);
    AgentRegistry.register(agent);
  }
}

export function getValidators(): ValidatorAgent[] {
  return AgentRegistry.getAllValidators() as ValidatorAgent[];
}
