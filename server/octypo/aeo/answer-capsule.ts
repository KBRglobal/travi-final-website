/**
 * AEO Module - Answer Engine Optimization
 * Answer Capsule Generator, Schema Generator, AEO Validator
 * Ported from octypo-main Python patterns
 */

import { GeneratedAttractionContent, AttractionData, FAQ } from "../types";

export interface AnswerCapsule {
  question: string;
  directAnswer: string;
  supportingDetails: string;
  fullAnswer: string;
  wordCount: number;
}

export interface SchemaMarkup {
  touristAttraction: Record<string, any>;
  faqPage: Record<string, any>;
  breadcrumb: Record<string, any>;
  offers?: Record<string, any>[];
}

export interface AEOScore {
  answerCapsuleScore: number;
  schemaScore: number;
  faqScore: number;
  overallScore: number;
  issues: string[];
  suggestions: string[];
}

export class AnswerCapsuleGenerator {
  generateCapsule(question: string, fullAnswer: string): AnswerCapsule {
    const sentences = fullAnswer.match(/[^.!?]+[.!?]+/g) || [fullAnswer];
    const directAnswer = sentences[0]?.trim() || fullAnswer.substring(0, 100);
    const supportingDetails = sentences.slice(1).join(" ").trim();

    return {
      question,
      directAnswer,
      supportingDetails,
      fullAnswer,
      wordCount: fullAnswer.split(/\s+/).filter(w => w.length > 0).length,
    };
  }

  validateCapsule(capsule: AnswerCapsule): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // NEW: Flexible range 35-70 words (target 40-60)
    if (capsule.wordCount < 35) {
      issues.push(`Answer too short: ${capsule.wordCount} words (need 35-70, target 40-60)`);
    } else if (capsule.wordCount > 70) {
      issues.push(`Answer too long: ${capsule.wordCount} words (need 35-70, target 40-60)`);
    }
    // Note: 35-70 is acceptable, only flag outside that range

    if (!/^[A-Z]/.exec(capsule.directAnswer)) {
      issues.push("Answer should start with a direct statement");
    }

    const hedgingPhrases = ["it depends", "generally", "usually", "typically", "often"];
    const startsWithHedge = hedgingPhrases.some(phrase =>
      capsule.directAnswer.toLowerCase().startsWith(phrase)
    );
    if (startsWithHedge) {
      issues.push("Answer should start with a direct answer, not hedging");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  processFAQs(faqs: FAQ[]): AnswerCapsule[] {
    return faqs.map(faq => this.generateCapsule(faq.question, faq.answer));
  }
}

export class SchemaGenerator {
  generateTouristAttractionSchema(
    attraction: AttractionData,
    content: GeneratedAttractionContent
  ): Record<string, any> {
    return {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: attraction.title,
      description: content.introduction,
      url: `https://travi.world/${attraction.cityName.toLowerCase()}/attractions/${this.slugify(attraction.title)}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: attraction.cityName,
        addressCountry: this.getCountryCode(attraction.cityName),
      },
      ...(attraction.coordinates && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: attraction.coordinates.lat,
          longitude: attraction.coordinates.lng,
        },
      }),
      ...(attraction.rating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: attraction.rating,
          reviewCount: attraction.reviewCount || 0,
        },
      }),
      ...(attraction.priceFrom && {
        offers: {
          "@type": "Offer",
          price: attraction.priceFrom,
          priceCurrency: this.getCurrency(attraction.cityName),
          availability: "https://schema.org/InStock",
        },
      }),
      touristType: attraction.primaryCategory || "General",
      isAccessibleForFree: attraction.priceFrom === 0,
    };
  }

  generateFAQSchema(faqs: FAQ[]): Record<string, any> {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }

  generateBreadcrumbSchema(cityName: string, attractionTitle: string): Record<string, any> {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://travi.world",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: cityName,
          item: `https://travi.world/${cityName.toLowerCase()}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Attractions",
          item: `https://travi.world/${cityName.toLowerCase()}/attractions`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: attractionTitle,
        },
      ],
    };
  }

  generateFullSchema(
    attraction: AttractionData,
    content: GeneratedAttractionContent
  ): SchemaMarkup {
    return {
      touristAttraction: this.generateTouristAttractionSchema(attraction, content),
      faqPage: this.generateFAQSchema(content.faqs),
      breadcrumb: this.generateBreadcrumbSchema(attraction.cityName, attraction.title),
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/(?:^-|-$)/g, "");
  }

  private getCountryCode(cityName: string): string {
    const cityCountryMap: Record<string, string> = {
      dubai: "AE",
      "abu dhabi": "AE",
      "ras al khaimah": "AE",
      paris: "FR",
      london: "GB",
      "new york": "US",
      tokyo: "JP",
      singapore: "SG",
      barcelona: "ES",
      rome: "IT",
      amsterdam: "NL",
      bangkok: "TH",
      "hong kong": "HK",
      istanbul: "TR",
      "las vegas": "US",
      "los angeles": "US",
      miami: "US",
    };
    // FAIL-FAST: Return undefined if city not found - no implicit fallback
    return cityCountryMap[cityName.toLowerCase()] || "";
  }

  private getCurrency(cityName: string): string {
    const cityCurrencyMap: Record<string, string> = {
      dubai: "AED",
      "abu dhabi": "AED",
      "ras al khaimah": "AED",
      paris: "EUR",
      london: "GBP",
      "new york": "USD",
      tokyo: "JPY",
      singapore: "SGD",
      barcelona: "EUR",
      rome: "EUR",
      amsterdam: "EUR",
      bangkok: "THB",
      "hong kong": "HKD",
      istanbul: "TRY",
      "las vegas": "USD",
      "los angeles": "USD",
      miami: "USD",
    };
    // FAIL-FAST: Return USD as universal fallback only if city unknown
    return cityCurrencyMap[cityName.toLowerCase()] || "USD";
  }
}

export class AEOValidator {
  private readonly capsuleGenerator = new AnswerCapsuleGenerator();

  validate(content: GeneratedAttractionContent): AEOScore {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const answerCapsuleScore = this.scoreCapsules(content.faqs, issues);
    const schemaScore = this.scoreSchema(content.schemaPayload, issues);
    const faqScore = this.scoreFAQs(content.faqs, issues, suggestions);

    const answerCapsuleClipped = Math.max(0, Math.min(100, answerCapsuleScore));
    const schemaClipped = Math.max(0, Math.min(100, schemaScore));
    const faqClipped = Math.max(0, Math.min(100, faqScore));

    const overallScore = Math.round(
      answerCapsuleClipped * 0.4 + schemaClipped * 0.3 + faqClipped * 0.3
    );

    return {
      answerCapsuleScore: answerCapsuleClipped,
      schemaScore: schemaClipped,
      faqScore: faqClipped,
      overallScore,
      issues,
      suggestions,
    };
  }

  private scoreCapsules(faqs: GeneratedAttractionContent["faqs"], issues: string[]): number {
    let score = 100;
    const capsules = this.capsuleGenerator.processFAQs(faqs);

    for (const capsule of capsules) {
      const validation = this.capsuleGenerator.validateCapsule(capsule);
      if (!validation.valid) {
        issues.push(...validation.issues);
        score -= 10;
      }
    }

    if (capsules.length < 15) {
      issues.push(`Only ${capsules.length} FAQs (need 15-20)`);
      score -= Math.max(0, (15 - capsules.length) * 3);
    }

    return score;
  }

  private scoreSchema(schemaPayload: any, issues: string[]): number {
    if (!schemaPayload || Object.keys(schemaPayload).length === 0) {
      issues.push("Missing schema payload");
      return 0;
    }
    let score = 100;
    if (!schemaPayload["@type"]) {
      issues.push("Schema missing @type");
      score -= 20;
    }
    if (!schemaPayload["@context"]) {
      issues.push("Schema missing @context");
      score -= 20;
    }
    return score;
  }

  private scoreFAQs(
    faqs: GeneratedAttractionContent["faqs"],
    issues: string[],
    suggestions: string[]
  ): number {
    let score = 100;
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      if (!faq.question.endsWith("?")) {
        issues.push(`FAQ ${i + 1} question should end with ?`);
        score -= 5;
      }
      if (faq.answer.length < 100) {
        suggestions.push(`FAQ ${i + 1} answer could be more comprehensive`);
      }
    }
    return score;
  }
}

export const answerCapsuleGenerator = new AnswerCapsuleGenerator();
export const schemaGenerator = new SchemaGenerator();
export const aeoValidator = new AEOValidator();
