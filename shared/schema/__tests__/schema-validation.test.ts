/**
 * Tests for Zod Schema Validation
 *
 * Tests that drizzle-zod generated insert schemas correctly validate data,
 * including required fields, type coercion, and rejection of invalid input.
 */

import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertContentSchema,
  insertNewsletterSubscriberSchema,
  insertSessionSchema,
  insertOtpCodeSchema,
} from "../index";

describe("insertUserSchema", () => {
  it("accepts valid user data with all fields", () => {
    const data = {
      id: "user-123",
      username: "testuser",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "editor",
      isActive: true,
    };
    const result = insertUserSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts minimal user data (no required fields except defaults)", () => {
    // The drizzle schema has defaults for role and isActive
    const data = {};
    const result = insertUserSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts valid role values", () => {
    const roles = ["admin", "editor", "author", "contributor", "viewer"];
    for (const role of roles) {
      const result = insertUserSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid role values", () => {
    const result = insertUserSchema.safeParse({ role: "superuser" });
    expect(result.success).toBe(false);
  });

  it("accepts boolean isActive values", () => {
    const active = insertUserSchema.safeParse({ isActive: true });
    const inactive = insertUserSchema.safeParse({ isActive: false });
    expect(active.success).toBe(true);
    expect(inactive.success).toBe(true);
  });
});

describe("insertContentSchema", () => {
  it("accepts valid content with required fields", () => {
    const data = {
      type: "article",
      title: "Best Hotels in Dubai",
      slug: "best-hotels-dubai",
      status: "draft",
    };
    const result = insertContentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires title field", () => {
    const data = {
      type: "article",
      slug: "test-slug",
    };
    const result = insertContentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
    }
  });

  it("requires slug field", () => {
    const data = {
      type: "article",
      title: "Test Title",
    };
    const result = insertContentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.slug).toBeDefined();
    }
  });

  it("requires type field", () => {
    const data = {
      title: "Test Title",
      slug: "test-slug",
    };
    const result = insertContentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.type).toBeDefined();
    }
  });

  it("accepts all valid content types", () => {
    const types = [
      "attraction",
      "hotel",
      "article",
      "dining",
      "restaurant",
      "district",
      "transport",
      "event",
      "itinerary",
      "landing_page",
      "case_study",
      "off_plan",
    ];
    for (const type of types) {
      const result = insertContentSchema.safeParse({
        type,
        title: "Test",
        slug: "test",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid content type", () => {
    const result = insertContentSchema.safeParse({
      type: "podcast",
      title: "Test",
      slug: "test",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid content statuses", () => {
    const statuses = [
      "draft",
      "in_review",
      "reviewed",
      "approved",
      "scheduled",
      "published",
      "archived",
    ];
    for (const status of statuses) {
      const result = insertContentSchema.safeParse({
        type: "article",
        title: "Test",
        slug: "test",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = insertContentSchema.safeParse({
      type: "article",
      title: "Test",
      slug: "test",
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional SEO fields", () => {
    const data = {
      type: "article",
      title: "Dubai Travel Guide",
      slug: "dubai-travel-guide",
      metaTitle: "Dubai Travel Guide 2024 | Best Tips",
      metaDescription: "Complete guide to Dubai tourism",
      primaryKeyword: "dubai travel guide",
      seoScore: 85,
      aeoScore: 72,
    };
    const result = insertContentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts content intent enum values", () => {
    const intents = ["informational", "commercial", "transactional", "navigational"];
    for (const intent of intents) {
      const result = insertContentSchema.safeParse({
        type: "article",
        title: "Test",
        slug: "test",
        intent,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("insertNewsletterSubscriberSchema", () => {
  it("accepts valid subscriber with email", () => {
    const data = {
      email: "subscriber@example.com",
    };
    const result = insertNewsletterSubscriberSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires email field", () => {
    const data = {
      firstName: "John",
    };
    const result = insertNewsletterSubscriberSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.email).toBeDefined();
    }
  });

  it("accepts full subscriber data", () => {
    const data = {
      email: "full@example.com",
      firstName: "Jane",
      lastName: "Smith",
      locale: "en",
      source: "coming_soon",
      status: "subscribed",
    };
    const result = insertNewsletterSubscriberSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts valid subscriber statuses", () => {
    const statuses = [
      "pending_confirmation",
      "subscribed",
      "unsubscribed",
      "bounced",
      "complained",
    ];
    for (const status of statuses) {
      const result = insertNewsletterSubscriberSchema.safeParse({
        email: "test@example.com",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid subscriber status", () => {
    const result = insertNewsletterSubscriberSchema.safeParse({
      email: "test@example.com",
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertSessionSchema", () => {
  it("accepts valid session data", () => {
    const data = {
      sid: "session-abc-123",
      sess: { cookie: { maxAge: 3600000 } },
      expire: new Date(),
    };
    const result = insertSessionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires sid field", () => {
    const result = insertSessionSchema.safeParse({
      sess: {},
      expire: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("requires sess field", () => {
    const result = insertSessionSchema.safeParse({
      sid: "test-sid",
      expire: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("requires expire field", () => {
    const result = insertSessionSchema.safeParse({
      sid: "test-sid",
      sess: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("insertOtpCodeSchema", () => {
  it("accepts valid OTP code data", () => {
    const data = {
      email: "user@example.com",
      code: "123456",
      expiresAt: new Date(Date.now() + 600000),
    };
    const result = insertOtpCodeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("requires email field", () => {
    const result = insertOtpCodeSchema.safeParse({
      code: "123456",
      expiresAt: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("requires code field", () => {
    const result = insertOtpCodeSchema.safeParse({
      email: "user@example.com",
      expiresAt: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("requires expiresAt field", () => {
    const result = insertOtpCodeSchema.safeParse({
      email: "user@example.com",
      code: "123456",
    });
    expect(result.success).toBe(false);
  });
});
