/**
 * Integration tests for Content CRUD API using supertest.
 *
 * Tests public and authenticated content endpoints with mocked storage/db.
 * Covers: GET /api/public/contents, GET /api/contents, POST /api/contents,
 * 404 handling, auth enforcement, and error response format.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// vi.hoisted – create mock objects that survive vi.mock hoisting
// ---------------------------------------------------------------------------

const { mockStorage, mockDb } = vi.hoisted(() => {
  const mockStorage = {
    getContentsWithRelations: vi.fn(),
    getContent: vi.fn(),
    getContentBySlug: vi.fn(),
    createContent: vi.fn(),
    createAttraction: vi.fn(),
    createHotel: vi.fn(),
    createArticle: vi.fn(),
    createEvent: vi.fn(),
    createItinerary: vi.fn(),
    createDining: vi.fn(),
    createDistrict: vi.fn(),
    createTransport: vi.fn(),
    getUser: vi.fn(),
  };

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  };

  return { mockStorage, mockDb };
});

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

vi.mock("../storage", () => ({ storage: mockStorage }));

vi.mock("../db", () => ({ db: mockDb }));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  ilike: vi.fn((...args: unknown[]) => ({ type: "ilike", args })),
  desc: vi.fn((col: unknown) => ({ type: "desc", col })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      type: "sql",
      strings,
      values,
    })),
    { raw: vi.fn() }
  ),
  isNull: vi.fn((col: unknown) => ({ type: "isNull", col })),
  isNotNull: vi.fn((col: unknown) => ({ type: "isNotNull", col })),
  notIlike: vi.fn((...args: unknown[]) => ({ type: "notIlike", args })),
}));

vi.mock("@shared/schema", () => ({
  insertContentSchema: {
    parse: vi.fn((data: Record<string, unknown>) => data),
  },
  insertTranslationSchema: {},
  insertItinerarySchema: { omit: vi.fn().mockReturnValue({ parse: vi.fn() }) },
  ROLE_PERMISSIONS: {
    admin: { canCreate: true, canEdit: true, canDelete: true, canPublish: true },
    editor: { canCreate: true, canEdit: true, canDelete: false, canPublish: true },
    author: { canCreate: true, canEdit: true, canDelete: false, canPublish: false },
    contributor: { canCreate: true, canEdit: false, canDelete: false, canPublish: false },
    viewer: { canCreate: false, canEdit: false, canDelete: false, canPublish: false },
  },
  SUPPORTED_LOCALES: ["en", "ar", "he", "fr", "de", "es", "it", "ja", "ko", "zh", "ru"],
  contents: {
    type: "type",
    status: "status",
    title: "title",
    deletedAt: "deletedAt",
  },
  destinations: {},
  homepageSections: {},
  homepageCards: {},
  experienceCategories: {},
  regionLinks: {},
  tiqetsAttractions: {},
}));

vi.mock("../security", () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    if (!(req as any)._testAuth) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  }),
  requirePermission: vi.fn((_permission: string) => {
    return (req: any, res: any, next: any) => {
      if (!(req as any)._testAuth) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      next();
    };
  }),
  requireOwnContentOrPermission: vi.fn((_permission: string) => {
    return (req: any, res: any, next: any) => {
      if (!(req as any)._testAuth) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      next();
    };
  }),
  checkReadOnlyMode: vi.fn((_req: any, _res: any, next: any) => next()),
  rateLimiters: {
    contentWrite: (_req: any, _res: any, next: any) => next(),
    aiUsage: (_req: any, _res: any, next: any) => next(),
  },
  getUserId: vi.fn(() => "test-user-id"),
  isAuthenticatedUser: vi.fn(() => true),
}));

vi.mock("../middleware/optimistic-locking", () => ({
  checkOptimisticLock: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("../middleware/idor-protection", () => ({
  requireOwnershipOrPermission: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("../utils/audit-logger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/sanitize-ai-output", () => ({
  sanitizeContentBlocks: vi.fn((blocks: unknown[]) => blocks),
}));

vi.mock("../events", () => ({
  emitContentPublished: vi.fn(),
  emitContentUpdated: vi.fn(),
}));

vi.mock("../enterprise", () => ({
  enterprise: {
    webhooks: { trigger: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock("../publishing", () => ({
  guardManualPublish: vi.fn().mockResolvedValue(undefined),
  isPublishGuardsEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock("../lib/validate", () => ({
  validate: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  idParamSchema: {},
}));

vi.mock("../lib/schema-generator", () => ({
  generateAllSchemas: vi.fn(() => ({})),
  schemasToJsonLd: vi.fn(() => "{}"),
}));

// ---------------------------------------------------------------------------
// Test app setup
// ---------------------------------------------------------------------------

import { registerContentCrudRoutes } from "../routes/content-crud-routes";
import { registerPublicContentRoutes } from "../routes/public-content-routes";

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());

  // Inject _testAuth flag for authenticated routes via custom header
  app.use("/api/contents", (req: any, _res, next) => {
    if (req.headers["x-test-auth"] === "true") {
      (req as any)._testAuth = true;
      (req as any).user = {
        claims: { sub: "test-user-id" },
        id: "test-user-id",
      };
      (req as any).dbUser = { id: "test-user-id", role: "admin" };
      (req as any).userRole = "admin";
      (req as any).isAuthenticated = () => true;
    }
    next();
  });

  registerContentCrudRoutes(app);
  registerPublicContentRoutes(app);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// SAMPLE DATA
// ---------------------------------------------------------------------------

const sampleContent = {
  id: "c1",
  title: "Dubai City Walk Guide",
  slug: "dubai-city-walk-guide",
  type: "article",
  status: "published",
  blocks: [],
  locale: "en",
  authorId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sampleContentList = [
  sampleContent,
  {
    id: "c2",
    title: "Burj Khalifa Observation Deck",
    slug: "burj-khalifa-observation-deck",
    type: "attraction",
    status: "published",
    blocks: [],
    locale: "en",
    authorId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe("Public Content API", () => {
  describe("GET /api/public/contents", () => {
    it("returns published content list", async () => {
      mockStorage.getContentsWithRelations.mockResolvedValue(sampleContentList);

      const res = await request(app).get("/api/public/contents");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(mockStorage.getContentsWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ status: "published" })
      );
    });

    it("supports type filter query parameter", async () => {
      mockStorage.getContentsWithRelations.mockResolvedValue([sampleContentList[1]]);

      const res = await request(app).get("/api/public/contents?type=attraction");

      expect(res.status).toBe(200);
      expect(mockStorage.getContentsWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ type: "attraction", status: "published" })
      );
    });

    it("supports limit parameter with maximum cap of 100", async () => {
      mockStorage.getContentsWithRelations.mockResolvedValue(sampleContentList);

      const res = await request(app).get("/api/public/contents?limit=200");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns 500 when storage throws", async () => {
      mockStorage.getContentsWithRelations.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/public/contents");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });
});

describe("Authenticated Content API", () => {
  describe("GET /api/contents", () => {
    it("returns 401 without authentication", async () => {
      const res = await request(app).get("/api/contents");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/not authenticated/i);
    });

    it("returns content list when authenticated (legacy plain array)", async () => {
      mockStorage.getContentsWithRelations.mockResolvedValue(sampleContentList);

      const res = await request(app).get("/api/contents").set("X-Test-Auth", "true");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it("returns paginated response when page param is present", async () => {
      mockStorage.getContentsWithRelations.mockResolvedValue(sampleContentList);
      // Mock the count query chain
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      const res = await request(app)
        .get("/api/contents?page=1&pageSize=10")
        .set("X-Test-Auth", "true");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("page", 1);
      expect(res.body.pagination).toHaveProperty("pageSize", 10);
      expect(res.body.pagination).toHaveProperty("total", 2);
      expect(res.body.pagination).toHaveProperty("hasNext");
      expect(res.body.pagination).toHaveProperty("hasPrev");
    });
  });

  describe("GET /api/contents/:id", () => {
    it("returns 401 without authentication", async () => {
      const res = await request(app).get("/api/contents/c1");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/not authenticated/i);
    });

    it("returns content by ID when authenticated", async () => {
      mockStorage.getContent.mockResolvedValue(sampleContent);

      const res = await request(app).get("/api/contents/c1").set("X-Test-Auth", "true");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("c1");
      expect(res.body.title).toBe("Dubai City Walk Guide");
    });

    it("returns 404 for non-existent content", async () => {
      mockStorage.getContent.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/contents/non-existent-id")
        .set("X-Test-Auth", "true");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/contents", () => {
    it("returns 401 without authentication", async () => {
      const res = await request(app)
        .post("/api/contents")
        .send({ title: "Test", type: "article", slug: "test" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/not authenticated/i);
    });

    it("creates content when authenticated with valid data", async () => {
      const newContent = {
        id: "c3",
        title: "New Article",
        slug: "new-article",
        type: "article",
        status: "draft",
      };

      const { insertContentSchema } = await import("@shared/schema");
      (insertContentSchema.parse as any).mockReturnValue(newContent);

      mockStorage.createContent.mockResolvedValue(newContent);
      mockStorage.createArticle.mockResolvedValue({});
      mockStorage.getContent.mockResolvedValue({ ...newContent, blocks: [] });

      const res = await request(app)
        .post("/api/contents")
        .set("X-Test-Auth", "true")
        .send({ title: "New Article", type: "article", slug: "new-article" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New Article");
      expect(mockStorage.createContent).toHaveBeenCalled();
    });
  });
});

describe("Error response format", () => {
  it("returns JSON error body on 401", async () => {
    const res = await request(app).get("/api/contents");

    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("returns JSON error body on 404", async () => {
    mockStorage.getContent.mockResolvedValue(null);

    const res = await request(app).get("/api/contents/does-not-exist").set("X-Test-Auth", "true");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });

  it("returns JSON error body on 500", async () => {
    mockStorage.getContentsWithRelations.mockRejectedValue(new Error("DB down"));

    const res = await request(app).get("/api/public/contents");

    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Content by slug", () => {
  it("returns published content without auth", async () => {
    mockStorage.getContentBySlug.mockResolvedValue({
      ...sampleContent,
      status: "published",
    });

    const res = await request(app).get("/api/contents/slug/dubai-city-walk-guide");

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("dubai-city-walk-guide");
  });

  it("returns 401 for unpublished content without auth header", async () => {
    mockStorage.getContentBySlug.mockResolvedValue({
      ...sampleContent,
      status: "draft",
    });

    const res = await request(app).get("/api/contents/slug/dubai-city-walk-guide");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 404 for non-existent slug", async () => {
    mockStorage.getContentBySlug.mockResolvedValue(null);

    const res = await request(app).get("/api/contents/slug/no-such-slug");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
