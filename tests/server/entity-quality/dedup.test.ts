/**
 * Tests for Entity Quality: Dedup Scanner
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubEnv("ENABLE_ENTITY_QUALITY", "true");

import {
  isEntityQualityEnabled,
  ENTITY_QUALITY_CONFIG,
} from "../../../server/entity-quality/config";
import {
  normalizeText,
  normalizePhone,
  normalizeWebsite,
  stringSimilarity,
  geoDistance,
  geoSimilarity,
  phoneSimilarity,
  websiteSimilarity,
} from "../../../server/entity-quality/normalizer";
import { calculateMatch, scanForDuplicates } from "../../../server/entity-quality/dedup-scanner";
import {
  addSuggestions,
  getSuggestionById,
  querySuggestions,
  ignoreSuggestion,
  markAsMerged,
  getSuggestionStats,
  clearAllSuggestions,
} from "../../../server/entity-quality/suggestion-store";
import type { EntityReference, MergeSuggestion } from "../../../server/entity-quality/types";

describe("Entity Quality: Dedup Scanner", () => {
  beforeEach(() => {
    vi.stubEnv("ENABLE_ENTITY_QUALITY", "true");
    clearAllSuggestions();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAllSuggestions();
  });

  describe("Feature Flag", () => {
    it("should be enabled when env is true", () => {
      vi.stubEnv("ENABLE_ENTITY_QUALITY", "true");
      expect(isEntityQualityEnabled()).toBe(true);
    });

    it("should be disabled when env is not set", () => {
      vi.stubEnv("ENABLE_ENTITY_QUALITY", "");
      expect(isEntityQualityEnabled()).toBe(false);
    });
  });

  describe("Normalizer", () => {
    it("should normalize text", () => {
      expect(normalizeText("The Ritz Hotel")).toBe("ritz");
      expect(normalizeText("  GRAND CAFE  ")).toBe("grand");
      // Note: normalizeText removes common suffixes like 'restaurant', 'club', etc.
      // 'Beach Club & Restaurant' -> 'beach club & restaurant' -> remove 'restaurant' suffix -> 'beach club &' -> remove special chars -> 'beach club'
      expect(normalizeText("Beach Club & Restaurant")).toBe("beach club");
    });

    it("should normalize phone numbers", () => {
      expect(normalizePhone("+971 4 123-4567")).toBe("+97141234567");
      expect(normalizePhone("(04) 123 4567")).toBe("041234567");
    });

    it("should normalize websites", () => {
      expect(normalizeWebsite("https://www.example.com/")).toBe("example.com");
      expect(normalizeWebsite("http://hotel.dubai.ae/rooms")).toBe("hotel.dubai.ae/rooms");
    });
  });

  describe("Similarity Functions", () => {
    it("should calculate string similarity", () => {
      expect(stringSimilarity("hello", "hello")).toBe(1);
      expect(stringSimilarity("hello", "hallo")).toBeGreaterThan(0.7);
      expect(stringSimilarity("abc", "xyz")).toBeLessThan(0.5);
    });

    it("should calculate geo distance", () => {
      // Dubai Marina to Palm Jumeirah (~5km)
      const distance = geoDistance(25.0808, 55.1376, 25.1124, 55.139);
      expect(distance).toBeGreaterThan(2);
      expect(distance).toBeLessThan(10);
    });

    it("should calculate geo similarity", () => {
      // Same location
      expect(geoSimilarity(25.0, 55.0, 25.0, 55.0, 0.5)).toBe(1);

      // Within threshold
      expect(geoSimilarity(25.0, 55.0, 25.001, 55.001, 0.5)).toBeGreaterThan(0.5);

      // Far apart
      expect(geoSimilarity(25.0, 55.0, 26.0, 56.0, 0.5)).toBe(0);

      // Missing coordinates
      expect(geoSimilarity(25.0, undefined, 25.0, 55.0, 0.5)).toBe(0);
    });

    it("should calculate phone similarity", () => {
      expect(phoneSimilarity("+97141234567", "04-123-4567")).toBeGreaterThan(0.5);
      expect(phoneSimilarity("+97141234567", "+97141234567")).toBe(1);
    });

    it("should calculate website similarity", () => {
      expect(websiteSimilarity("https://example.com", "http://www.example.com/")).toBe(1);
      expect(websiteSimilarity("https://hotel.ae", "https://hotel.com")).toBeGreaterThan(0.5);
    });
  });

  describe("Match Calculation", () => {
    it("should calculate match between similar entities", () => {
      const entity1: EntityReference = {
        id: "e1",
        type: "hotel",
        name: "Grand Hotel Dubai",
        normalizedName: "grand hotel dubai",
        destinationId: "dubai",
        latitude: 25.0,
        longitude: 55.0,
        phone: "+971-4-123-4567",
      };

      const entity2: EntityReference = {
        id: "e2",
        type: "hotel",
        name: "Grand Hotel Dubai",
        normalizedName: "grand hotel dubai",
        destinationId: "dubai",
        latitude: 25.001,
        longitude: 55.001,
        phone: "+971-4-123-4567",
      };

      const match = calculateMatch(entity1, entity2);
      // With identical names (50% weight), close geo (20% weight), and matching phones (15% weight)
      // Score should be well above 50
      expect(match.similarity).toBeGreaterThan(50);
      expect(match.reasons.length).toBeGreaterThan(0);
    });

    it("should return low match for different entities", () => {
      const entity1: EntityReference = {
        id: "e1",
        type: "hotel",
        name: "Beach Resort",
        normalizedName: "beach resort",
      };

      const entity2: EntityReference = {
        id: "e2",
        type: "hotel",
        name: "Mountain Lodge",
        normalizedName: "mountain lodge",
      };

      const match = calculateMatch(entity1, entity2);
      expect(match.similarity).toBeLessThan(50);
    });
  });

  describe("Scanner", () => {
    it("should find duplicates in entity list", () => {
      // Entities need to score >= minConfidenceThreshold (70) to be flagged as duplicates
      // With name weight 0.5, geo weight 0.2, phone weight 0.15, we need multiple matching factors
      const entities: EntityReference[] = [
        {
          id: "e1",
          type: "hotel",
          name: "Grand Hotel",
          normalizedName: "grand hotel",
          destinationId: "dubai",
          latitude: 25.0,
          longitude: 55.0,
          phone: "+971-4-555-1234",
        },
        {
          id: "e2",
          type: "hotel",
          name: "Grand Hotel Dubai",
          normalizedName: "grand hotel",
          destinationId: "dubai",
          latitude: 25.0001,
          longitude: 55.0001,
          phone: "+971-4-555-1234",
        },
        {
          id: "e3",
          type: "hotel",
          name: "Beach Resort",
          normalizedName: "beach resort",
          destinationId: "dubai",
        },
      ];

      const suggestions = scanForDuplicates(entities, "hotel");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should respect batch size limit", () => {
      const entities: EntityReference[] = Array.from({ length: 200 }, (_, i) => ({
        id: `e${i}`,
        type: "hotel" as const,
        name: `Hotel ${i}`,
        normalizedName: `hotel ${i}`,
        destinationId: "dubai",
      }));

      const suggestions = scanForDuplicates(entities, "hotel");
      // Should not exceed what's possible with batch size
      expect(suggestions.length).toBeLessThanOrEqual(
        (ENTITY_QUALITY_CONFIG.batchSize * (ENTITY_QUALITY_CONFIG.batchSize - 1)) / 2
      );
    });
  });

  describe("Suggestion Store", () => {
    it("should add and retrieve suggestions", () => {
      const suggestion: MergeSuggestion = {
        id: "sug_1",
        entityType: "hotel",
        primaryEntity: { id: "e1", type: "hotel", name: "A", normalizedName: "a" },
        duplicateEntity: { id: "e2", type: "hotel", name: "B", normalizedName: "b" },
        confidenceScore: 85,
        matchReasons: [],
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addSuggestions([suggestion]);
      const found = getSuggestionById("sug_1");
      expect(found).not.toBeNull();
      expect(found?.confidenceScore).toBe(85);
    });

    it("should query suggestions with filters", () => {
      const suggestions: MergeSuggestion[] = [
        {
          id: "sug_1",
          entityType: "hotel",
          primaryEntity: { id: "e1", type: "hotel", name: "A", normalizedName: "a" },
          duplicateEntity: { id: "e2", type: "hotel", name: "B", normalizedName: "b" },
          confidenceScore: 90,
          matchReasons: [],
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "sug_2",
          entityType: "attraction",
          primaryEntity: { id: "e3", type: "attraction", name: "C", normalizedName: "c" },
          duplicateEntity: { id: "e4", type: "attraction", name: "D", normalizedName: "d" },
          confidenceScore: 75,
          matchReasons: [],
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      addSuggestions(suggestions);

      const hotels = querySuggestions({ entityType: "hotel" });
      expect(hotels.length).toBe(1);

      const highConfidence = querySuggestions({ minConfidence: 80 });
      expect(highConfidence.length).toBe(1);
    });

    it("should ignore and mark suggestions", () => {
      const suggestion: MergeSuggestion = {
        id: "sug_1",
        entityType: "hotel",
        primaryEntity: { id: "e1", type: "hotel", name: "A", normalizedName: "a" },
        duplicateEntity: { id: "e2", type: "hotel", name: "B", normalizedName: "b" },
        confidenceScore: 85,
        matchReasons: [],
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addSuggestions([suggestion]);

      const ignored = ignoreSuggestion("sug_1", "admin");
      expect(ignored?.status).toBe("ignored");
      expect(ignored?.ignoredBy).toBe("admin");
    });

    it("should calculate stats", () => {
      const suggestions: MergeSuggestion[] = [
        {
          id: "sug_1",
          entityType: "hotel",
          primaryEntity: { id: "e1", type: "hotel", name: "A", normalizedName: "a" },
          duplicateEntity: { id: "e2", type: "hotel", name: "B", normalizedName: "b" },
          confidenceScore: 90,
          matchReasons: [],
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "sug_2",
          entityType: "hotel",
          primaryEntity: { id: "e3", type: "hotel", name: "C", normalizedName: "c" },
          duplicateEntity: { id: "e4", type: "hotel", name: "D", normalizedName: "d" },
          confidenceScore: 75,
          matchReasons: [],
          status: "ignored",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      addSuggestions(suggestions);

      const stats = getSuggestionStats();
      expect(stats.total).toBe(2);
      expect(stats.open).toBe(1);
      expect(stats.ignored).toBe(1);
    });
  });
});
