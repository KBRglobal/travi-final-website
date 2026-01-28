/**
 * Entity Merge Tests
 *
 * Tests for duplicate detection, name normalization, and merge logic.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Test pure functions directly
describe("Entity Merge - Name Normalization", () => {
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[''`]/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[^\w\s'-]/g, "")
      .replace(/\s+/g, " ");
  };

  it("should lowercase names", () => {
    expect(normalizeName("Dubai")).toBe("dubai");
    expect(normalizeName("BURJ KHALIFA")).toBe("burj khalifa");
  });

  it("should trim whitespace", () => {
    expect(normalizeName("  Dubai  ")).toBe("dubai");
    expect(normalizeName("\tPalm Jumeirah\n")).toBe("palm jumeirah");
  });

  it("should normalize smart quotes", () => {
    expect(normalizeName("Dubai's Best")).toBe("dubai's best");
    expect(normalizeName("The \u201CBest\u201D Hotels")).toBe("the best hotels");
  });

  it("should collapse multiple spaces", () => {
    expect(normalizeName("Burj   Khalifa")).toBe("burj khalifa");
    expect(normalizeName("Palm  Jumeirah  Island")).toBe("palm jumeirah island");
  });

  it("should preserve hyphens and apostrophes", () => {
    expect(normalizeName("Ras Al-Khaimah")).toBe("ras al-khaimah");
    expect(normalizeName("Dubai's Marina")).toBe("dubai's marina");
  });
});

describe("Entity Merge - Levenshtein Distance", () => {
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("dubai", "dubai")).toBe(0);
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("should return string length for empty comparison", () => {
    expect(levenshteinDistance("dubai", "")).toBe(5);
    expect(levenshteinDistance("", "dubai")).toBe(5);
  });

  it("should calculate single character differences", () => {
    expect(levenshteinDistance("dubai", "dubay")).toBe(1);
    expect(levenshteinDistance("hotel", "hotell")).toBe(1);
  });

  it("should handle multiple character differences", () => {
    expect(levenshteinDistance("burj khalifa", "burj kalifa")).toBe(1);
    expect(levenshteinDistance("palm", "plam")).toBe(2); // swap = 2 operations
  });
});

describe("Entity Merge - Similarity Score", () => {
  const calculateSimilarity = (a: string, b: string): number => {
    const normalizeName = (name: string): string => {
      return name.toLowerCase().trim().replace(/\s+/g, " ");
    };

    const levenshteinDistance = (s1: string, s2: string): number => {
      if (s1.length === 0) return s2.length;
      if (s2.length === 0) return s1.length;

      const matrix: number[][] = [];
      for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
          if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[s2.length][s1.length];
    };

    const normalA = normalizeName(a);
    const normalB = normalizeName(b);

    if (normalA === normalB) return 1.0;

    const maxLen = Math.max(normalA.length, normalB.length);
    if (maxLen === 0) return 1.0;

    const distance = levenshteinDistance(normalA, normalB);
    return 1 - distance / maxLen;
  };

  it("should return 1.0 for identical strings", () => {
    expect(calculateSimilarity("Dubai", "dubai")).toBe(1.0);
    expect(calculateSimilarity("Palm Jumeirah", "palm jumeirah")).toBe(1.0);
  });

  it("should return high similarity for minor typos", () => {
    const similarity = calculateSimilarity("Burj Khalifa", "Burj Kalifa");
    expect(similarity).toBeGreaterThan(0.9);
  });

  it("should return lower similarity for different names", () => {
    const similarity = calculateSimilarity("Dubai", "Abu Dhabi");
    expect(similarity).toBeLessThan(0.5);
  });

  it("should handle empty strings", () => {
    expect(calculateSimilarity("", "")).toBe(1.0);
  });
});

describe("Entity Merge - Alias Detection", () => {
  const KNOWN_ALIASES: Record<string, string[]> = {
    dubai: ["dubay", "dubaï", "dubái"],
    "burj khalifa": ["burj kalifa", "burjkhalifa", "burj-khalifa"],
    "palm jumeirah": ["palm jumeira", "the palm", "palm island"],
  };

  const checkAliasMatch = (nameA: string, nameB: string): boolean => {
    const normalA = nameA.toLowerCase().trim();
    const normalB = nameB.toLowerCase().trim();

    for (const [canonical, aliases] of Object.entries(KNOWN_ALIASES)) {
      const allForms = [canonical, ...aliases];
      const matchA = allForms.includes(normalA);
      const matchB = allForms.includes(normalB);
      if (matchA && matchB && normalA !== normalB) {
        return true;
      }
    }
    return false;
  };

  it("should detect known aliases", () => {
    expect(checkAliasMatch("Dubai", "Dubay")).toBe(true);
    expect(checkAliasMatch("Burj Khalifa", "Burj Kalifa")).toBe(true);
    expect(checkAliasMatch("Palm Jumeirah", "The Palm")).toBe(true);
  });

  it("should not match same name", () => {
    expect(checkAliasMatch("Dubai", "Dubai")).toBe(false);
  });

  it("should not match unrelated names", () => {
    expect(checkAliasMatch("Dubai", "Abu Dhabi")).toBe(false);
    expect(checkAliasMatch("Burj Khalifa", "Burj Al Arab")).toBe(false);
  });
});

describe("Entity Merge - Confidence Determination", () => {
  type MatchType = "exact_name" | "fuzzy_name" | "same_slug" | "same_location_name" | "alias_match";
  type Confidence = "high" | "medium" | "low";

  const determineConfidence = (matchType: MatchType, similarity: number): Confidence => {
    if (matchType === "exact_name" || matchType === "same_slug") {
      return "high";
    }
    if (matchType === "alias_match") {
      return "high";
    }
    if (matchType === "same_location_name") {
      return similarity >= 0.9 ? "high" : "medium";
    }
    if (matchType === "fuzzy_name") {
      if (similarity >= 0.95) return "high";
      if (similarity >= 0.9) return "medium";
      return "low";
    }
    return "low";
  };

  it("should return high confidence for exact matches", () => {
    expect(determineConfidence("exact_name", 1.0)).toBe("high");
    expect(determineConfidence("same_slug", 1.0)).toBe("high");
    expect(determineConfidence("alias_match", 0.95)).toBe("high");
  });

  it("should return medium confidence for good fuzzy matches", () => {
    expect(determineConfidence("fuzzy_name", 0.92)).toBe("medium");
    expect(determineConfidence("same_location_name", 0.85)).toBe("medium");
  });

  it("should return low confidence for weak matches", () => {
    expect(determineConfidence("fuzzy_name", 0.87)).toBe("low");
  });
});

describe("Entity Merge - Suggested Action", () => {
  type MatchType = "exact_name" | "fuzzy_name" | "same_slug" | "same_location_name" | "alias_match";
  type SuggestedAction = "merge" | "review" | "ignore";

  const suggestAction = (
    matchType: MatchType,
    similarity: number,
    sourceStatus: string,
    targetStatus: string
  ): SuggestedAction => {
    // Status-based priority
    if (sourceStatus === "draft" && targetStatus === "published") {
      return "merge";
    }
    if (sourceStatus === "published" && targetStatus === "draft") {
      return "merge";
    }

    // Match type priority
    if (matchType === "exact_name" || matchType === "same_slug") {
      return "merge";
    }
    if (matchType === "alias_match") {
      return "merge";
    }
    if (matchType === "same_location_name" && similarity >= 0.9) {
      return "merge";
    }
    if (matchType === "fuzzy_name" && similarity >= 0.95) {
      return "merge";
    }

    return "review";
  };

  it("should suggest merge for exact matches", () => {
    expect(suggestAction("exact_name", 1.0, "draft", "draft")).toBe("merge");
    expect(suggestAction("same_slug", 1.0, "draft", "draft")).toBe("merge");
  });

  it("should suggest merge when draft duplicates published", () => {
    expect(suggestAction("fuzzy_name", 0.85, "draft", "published")).toBe("merge");
  });

  it("should suggest review for uncertain matches", () => {
    expect(suggestAction("fuzzy_name", 0.88, "draft", "draft")).toBe("review");
    expect(suggestAction("same_location_name", 0.85, "draft", "draft")).toBe("review");
  });
});

describe("Entity Merge - Redirect Resolution", () => {
  interface Redirect {
    fromId: string;
    toId: string;
  }

  const resolveRedirectChain = (
    id: string,
    redirects: Map<string, Redirect>,
    maxDepth: number = 5
  ): string => {
    let currentId = id;
    let depth = 0;

    while (depth < maxDepth) {
      const redirect = redirects.get(currentId);
      if (!redirect) break;
      currentId = redirect.toId;
      depth++;
    }

    return currentId;
  };

  it("should return original id if no redirect", () => {
    const redirects = new Map<string, Redirect>();
    expect(resolveRedirectChain("entity-1", redirects)).toBe("entity-1");
  });

  it("should follow single redirect", () => {
    const redirects = new Map<string, Redirect>();
    redirects.set("old-id", { fromId: "old-id", toId: "new-id" });
    expect(resolveRedirectChain("old-id", redirects)).toBe("new-id");
  });

  it("should follow redirect chain", () => {
    const redirects = new Map<string, Redirect>();
    redirects.set("id-1", { fromId: "id-1", toId: "id-2" });
    redirects.set("id-2", { fromId: "id-2", toId: "id-3" });
    redirects.set("id-3", { fromId: "id-3", toId: "id-4" });
    expect(resolveRedirectChain("id-1", redirects)).toBe("id-4");
  });

  it("should respect max depth limit", () => {
    const redirects = new Map<string, Redirect>();
    for (let i = 1; i <= 10; i++) {
      redirects.set(`id-${i}`, { fromId: `id-${i}`, toId: `id-${i + 1}` });
    }
    // With max depth 5, should stop at id-6
    expect(resolveRedirectChain("id-1", redirects, 5)).toBe("id-6");
  });
});

describe("Entity Merge - Feature Flags", () => {
  it("should respect enable flag", () => {
    const isEntityMergeEnabled = (envValue: string | undefined): boolean => {
      return envValue === "true";
    };

    expect(isEntityMergeEnabled("true")).toBe(true);
    expect(isEntityMergeEnabled("false")).toBe(false);
    expect(isEntityMergeEnabled(undefined)).toBe(false);
    expect(isEntityMergeEnabled("")).toBe(false);
  });

  it("should respect auto-suggest flag", () => {
    const isMergeAutoSuggestEnabled = (envValue: string | undefined): boolean => {
      return envValue === "true";
    };

    expect(isMergeAutoSuggestEnabled("true")).toBe(true);
    expect(isMergeAutoSuggestEnabled("false")).toBe(false);
  });
});

describe("Entity Merge - Merge Strategy", () => {
  type MergeStrategy = "keep_target" | "keep_source" | "merge_content";

  interface ContentBlock {
    id: string;
    type: string;
    content: string;
  }

  const applyMergeStrategy = (
    sourceBlocks: ContentBlock[],
    targetBlocks: ContentBlock[],
    strategy: MergeStrategy
  ): ContentBlock[] => {
    switch (strategy) {
      case "keep_target":
        return targetBlocks;
      case "keep_source":
        return sourceBlocks;
      case "merge_content":
        return [...targetBlocks, ...sourceBlocks];
      default:
        return targetBlocks;
    }
  };

  const sourceBlocks: ContentBlock[] = [{ id: "s1", type: "text", content: "Source content" }];
  const targetBlocks: ContentBlock[] = [{ id: "t1", type: "text", content: "Target content" }];

  it("should keep target blocks with keep_target strategy", () => {
    const result = applyMergeStrategy(sourceBlocks, targetBlocks, "keep_target");
    expect(result).toEqual(targetBlocks);
  });

  it("should use source blocks with keep_source strategy", () => {
    const result = applyMergeStrategy(sourceBlocks, targetBlocks, "keep_source");
    expect(result).toEqual(sourceBlocks);
  });

  it("should combine blocks with merge_content strategy", () => {
    const result = applyMergeStrategy(sourceBlocks, targetBlocks, "merge_content");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("t1");
    expect(result[1].id).toBe("s1");
  });
});

describe("Entity Merge - Duplicate Pair Creation", () => {
  interface EntityInfo {
    id: string;
    name: string;
    slug: string;
    status: string;
  }

  const createDuplicatePairReasons = (
    entityA: EntityInfo,
    entityB: EntityInfo,
    matchType: string,
    similarity: number
  ): string[] => {
    const reasons: string[] = [];

    if (matchType === "exact_name") {
      reasons.push("Exact name match detected");
    } else if (matchType === "same_slug") {
      reasons.push("Same slug detected");
    } else if (matchType === "alias_match") {
      reasons.push("Known alias pattern detected");
    } else if (matchType === "same_location_name") {
      reasons.push(`Same location with ${(similarity * 100).toFixed(0)}% name similarity`);
    } else if (matchType === "fuzzy_name") {
      reasons.push(`Fuzzy name match: ${(similarity * 100).toFixed(0)}% similar`);
    }

    if (entityA.status === "draft" && entityB.status === "published") {
      reasons.push("Draft might be duplicate of published content");
    } else if (entityA.status === "published" && entityB.status === "draft") {
      reasons.push("Published content has potential draft duplicate");
    }

    return reasons;
  };

  it("should generate correct reasons for exact match", () => {
    const reasons = createDuplicatePairReasons(
      { id: "1", name: "Dubai", slug: "dubai", status: "draft" },
      { id: "2", name: "dubai", slug: "dubai-2", status: "draft" },
      "exact_name",
      1.0
    );
    expect(reasons).toContain("Exact name match detected");
  });

  it("should add status-based reason for draft vs published", () => {
    const reasons = createDuplicatePairReasons(
      { id: "1", name: "Dubai", slug: "dubai", status: "draft" },
      { id: "2", name: "Dubai", slug: "dubai-2", status: "published" },
      "exact_name",
      1.0
    );
    expect(reasons).toContain("Draft might be duplicate of published content");
  });

  it("should include similarity percentage for fuzzy matches", () => {
    const reasons = createDuplicatePairReasons(
      { id: "1", name: "Burj Khalifa", slug: "burj-khalifa", status: "draft" },
      { id: "2", name: "Burj Kalifa", slug: "burj-kalifa", status: "draft" },
      "fuzzy_name",
      0.92
    );
    expect(reasons[0]).toContain("92%");
  });
});
