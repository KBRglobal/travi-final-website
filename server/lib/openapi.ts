/**
 * OpenAPI 3.0 Specification
 *
 * Documents key TRAVI API endpoints including public, admin,
 * and authentication routes. Uses shared schemas for pagination
 * (from server/lib/pagination.ts) and RFC 7807 errors
 * (from server/lib/error-response.ts).
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TRAVI World API",
    description:
      "Travel Intelligence Platform API — serving destinations, attractions, content, and guides for 16+ worldwide destinations.",
    version: "1.0.0",
    contact: {
      name: "TRAVI Team",
      email: "info@travi.world",
      url: "https://travi.world",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current environment",
    },
  ],
  tags: [
    { name: "Public", description: "Public endpoints (no auth required)" },
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Admin", description: "Admin/CMS endpoints (auth required)" },
  ],
  paths: {
    // ================================================================
    // PUBLIC ENDPOINTS
    // ================================================================
    "/api/public/destinations": {
      get: {
        tags: ["Public"],
        summary: "List active destinations",
        description: "Returns all active destinations with card images and mood metadata.",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 50 },
            description: "Maximum number of destinations to return",
          },
        ],
        responses: {
          "200": {
            description: "Array of destinations",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DestinationSummary" },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/public/contents": {
      get: {
        tags: ["Public"],
        summary: "List published content",
        description:
          "Returns published content items. Supports pagination via page/pageSize or legacy offset/limit. Without pagination params, returns a plain array for backward compatibility.",
        parameters: [
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "attraction",
                "hotel",
                "article",
                "event",
                "itinerary",
                "dining",
                "district",
                "transport",
              ],
            },
            description: "Filter by content type",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by title (case-insensitive)",
          },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          { $ref: "#/components/parameters/Offset" },
          { $ref: "#/components/parameters/Limit" },
        ],
        responses: {
          "200": {
            description:
              "Paginated response envelope (when page/offset params present) or plain array",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/PaginatedContents" },
                    {
                      type: "array",
                      items: { $ref: "#/components/schemas/ContentSummary" },
                    },
                  ],
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/public/guides": {
      get: {
        tags: ["Public"],
        summary: "List published guides",
        description: "Returns published travel guides with locale-aware translations.",
        parameters: [
          {
            name: "locale",
            in: "query",
            schema: { type: "string", default: "en" },
            description: "Locale for translations (e.g. en, ar, fr)",
          },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
        ],
        responses: {
          "200": {
            description: "Guides with pagination metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    guides: {
                      type: "array",
                      items: { $ref: "#/components/schemas/GuideSummary" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                    locale: { type: "string" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/public/attractions/{city}": {
      get: {
        tags: ["Public"],
        summary: "List attractions by city",
        description: "Returns published attractions for a specific city with pagination.",
        parameters: [
          {
            name: "city",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "City name (e.g. dubai, london, paris)",
          },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
        ],
        responses: {
          "200": {
            description: "Attractions list with pagination",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    attractions: { type: "array", items: { type: "object" } },
                    city: { type: "string" },
                    affiliateLink: { type: "string" },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    totalPages: { type: "integer" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/public/homepage-config": {
      get: {
        tags: ["Public"],
        summary: "Get homepage configuration",
        description:
          "Returns the full CMS-driven homepage config including hero slides, sections, cards, and SEO metadata.",
        parameters: [
          {
            name: "locale",
            in: "query",
            schema: { type: "string", default: "en" },
            description: "Locale for translated content",
          },
        ],
        responses: {
          "200": {
            description: "Homepage configuration object",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ================================================================
    // AUTH ENDPOINTS
    // ================================================================
    "/api/login": {
      get: {
        tags: ["Auth"],
        summary: "Initiate login",
        description:
          "Redirects to the OIDC provider for authentication. After login, redirects back to /api/callback.",
        responses: {
          "302": { description: "Redirect to OIDC provider" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
    "/api/logout": {
      get: {
        tags: ["Auth"],
        summary: "Log out",
        description: "Destroys the session and redirects to the OIDC end-session endpoint.",
        responses: {
          "302": { description: "Redirect to OIDC end-session URL" },
        },
      },
    },

    // ================================================================
    // ADMIN ENDPOINTS
    // ================================================================
    "/api/contents": {
      get: {
        tags: ["Admin"],
        summary: "List all content (admin)",
        description:
          "Returns content items with relations (author, type-specific data). Supports pagination and filters. Requires authentication.",
        security: [{ session: [] }],
        parameters: [
          {
            name: "type",
            in: "query",
            schema: { type: "string" },
            description: "Filter by content type",
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["draft", "published", "scheduled", "archived"],
            },
            description: "Filter by status",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by title",
          },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
        ],
        responses: {
          "200": {
            description: "Paginated envelope (with page param) or plain array (without)",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/PaginatedContents" },
                    {
                      type: "array",
                      items: { $ref: "#/components/schemas/ContentSummary" },
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/contents/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get content by ID",
        description: "Returns a single content item with all relations. Requires authentication.",
        security: [{ session: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Content item with relations",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContentSummary" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      session: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description: "Session cookie set after OIDC login via /api/login",
      },
    },
    parameters: {
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
        description: "Page number (1-based)",
      },
      PageSize: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        description: "Items per page (max 100)",
      },
      Offset: {
        name: "offset",
        in: "query",
        schema: { type: "integer", minimum: 0 },
        description: "Legacy: number of items to skip",
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100 },
        description: "Legacy: max items to return",
      },
    },
    schemas: {
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          pageSize: { type: "integer", example: 20 },
          total: { type: "integer", example: 47 },
          totalPages: { type: "integer", example: 3 },
          hasNext: { type: "boolean", example: true },
          hasPrev: { type: "boolean", example: false },
        },
        required: ["page", "pageSize", "total", "totalPages", "hasNext", "hasPrev"],
      },
      ProblemDetails: {
        type: "object",
        description: "RFC 7807 Problem Details error response",
        properties: {
          type: {
            type: "string",
            format: "uri",
            example: "https://travi.travel/errors/not-found",
          },
          title: { type: "string", example: "Not Found" },
          status: { type: "integer", example: 404 },
          detail: { type: "string", example: "API endpoint GET /api/foo does not exist" },
          instance: { type: "string", example: "GET /api/foo" },
          error: {
            type: "string",
            description: "Legacy field (same as title) for backward compatibility",
          },
          errors: {
            type: "array",
            description: "Validation errors (present on 400 responses)",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        required: ["type", "title", "status"],
      },
      DestinationSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Dubai" },
          country: { type: "string", example: "UAE" },
          slug: { type: "string", example: "dubai" },
          destinationLevel: { type: "string" },
          cardImage: { type: "string", nullable: true },
          cardImageAlt: { type: "string", nullable: true },
          summary: { type: "string", nullable: true },
          heroImage: { type: "string", nullable: true },
          moodVibe: { type: "string", nullable: true },
          moodTagline: { type: "string", nullable: true },
          moodPrimaryColor: { type: "string", nullable: true },
        },
      },
      ContentSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          type: {
            type: "string",
            enum: [
              "attraction",
              "hotel",
              "article",
              "event",
              "itinerary",
              "dining",
              "district",
              "transport",
            ],
          },
          status: {
            type: "string",
            enum: ["draft", "published", "scheduled", "archived"],
          },
          summary: { type: "string", nullable: true },
          heroImage: { type: "string", nullable: true },
          cardImage: { type: "string", nullable: true },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PaginatedContents: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/ContentSummary" },
          },
          pagination: { $ref: "#/components/schemas/PaginationMeta" },
        },
        required: ["data", "pagination"],
      },
      GuideSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          title: { type: "string" },
          summary: { type: "string", nullable: true },
          locale: { type: "string" },
          availableLocales: {
            type: "array",
            items: { type: "string" },
          },
          destinationType: { type: "string", nullable: true },
          publishedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
    responses: {
      InternalError: {
        description: "Internal server error",
        content: {
          "application/problem+json": {
            schema: { $ref: "#/components/schemas/ProblemDetails" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/problem+json": {
            schema: { $ref: "#/components/schemas/ProblemDetails" },
          },
        },
      },
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string", example: "Unauthorized" },
              },
            },
          },
        },
      },
      ServiceUnavailable: {
        description: "Authentication service temporarily unavailable",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "string",
                  example: "Authentication service temporarily unavailable",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
