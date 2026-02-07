/**
 * Broken Promise Detector Types
 *
 * FEATURE 7: Broken Promise Detector (SEO/AEO)
 * Detects when content promises something in meta/titles but doesn't deliver
 */

export type PromiseType = "title" | "meta_description" | "h1" | "schema" | "faq" | "howto";
export type PromiseSeverity = "critical" | "major" | "minor";
export type PromiseStatus = "kept" | "broken" | "partial" | "not_applicable";

export interface BrokenPromise {
  id: string;
  contentId: string;
  type: PromiseType;
  promise: string; // What was promised (e.g., "Learn 10 tips")
  delivery: string; // What was actually delivered
  severity: PromiseSeverity;
  status: PromiseStatus;
  confidence: number; // 0-100 confidence in detection
  recommendation: string;
  detectedAt: Date;
}

export interface PromiseAnalysis {
  contentId: string;
  contentTitle: string;
  totalPromises: number;
  brokenPromises: number;
  partialPromises: number;
  keptPromises: number;
  trustScore: number; // 0-100
  promises: BrokenPromise[];
  analyzedAt: Date;
}

export interface PromisePattern {
  pattern: RegExp;
  type: PromiseType;
  description: string;
  validator: (content: string, match: string) => PromiseStatus;
}

export interface PromiseStats {
  totalAnalyzed: number;
  totalBrokenPromises: number;
  byType: Record<PromiseType, number>;
  bySeverity: Record<PromiseSeverity, number>;
  avgTrustScore: number;
  topOffenders: { contentId: string; brokenCount: number }[];
}

// Common promise patterns to detect
export const PROMISE_PATTERNS: { pattern: RegExp; type: PromiseType; description: string }[] = [
  // Number-based promises
  // Split numbered-list words to reduce regex complexity
  {
    pattern: new RegExp(
      `(\\d+)\\s+(${["tips?", "ways?", "steps?", "methods?", "strategies?", "reasons?", "examples?", "ideas?"].join("|")})`,
      "i"
    ),
    type: "title",
    description: "Numbered list promise",
  },
  { pattern: /top\s+(\d+)/i, type: "title", description: "Top N list promise" },
  { pattern: /best\s+(\d+)/i, type: "title", description: "Best N list promise" },

  // How-to promises
  { pattern: /how\s+to\s+(.+)/i, type: "h1", description: "How-to promise" },
  { pattern: /guide\s+to\s+(.+)/i, type: "title", description: "Guide promise" },
  { pattern: /complete\s+guide/i, type: "title", description: "Complete guide promise" },

  // Time/speed promises
  {
    pattern: /in\s+(\d+)\s+(minutes?|hours?|days?)/i,
    type: "title",
    description: "Time-bound promise",
  },
  { pattern: /quick(ly)?|fast|instant/i, type: "meta_description", description: "Speed promise" },

  // Outcome promises
  { pattern: /everything\s+you\s+need/i, type: "title", description: "Comprehensive promise" },
  { pattern: /ultimate\s+guide/i, type: "title", description: "Ultimate content promise" },
  { pattern: /definitive\s+guide/i, type: "title", description: "Definitive content promise" },
];

export function isBrokenPromiseDetectorEnabled(): boolean {
  return process.env.ENABLE_BROKEN_PROMISE_DETECTOR === "true";
}
