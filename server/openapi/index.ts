import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Session-based authentication. Login via /api/auth/login to obtain a session cookie.",
});

const sessionAuth = registry.registerComponent("securitySchemes", "sessionAuth", {
  type: "apiKey",
  in: "cookie",
  name: "connect.sid",
  description: "Express session cookie for authenticated requests",
});

const ErrorSchema = z.object({
  error: z.string().openapi({ description: "Error message" }),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional().openapi({ description: "Validation error details" }),
}).openapi("Error");

const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1).openapi({ description: "Page number" }),
  limit: z.number().int().min(1).max(100).default(20).openapi({ description: "Items per page" }),
  total: z.number().int().openapi({ description: "Total items" }),
}).openapi("Pagination");

const ContentTypeEnum = z.enum(["attraction", "hotel", "article", "dining", "district", "transport", "event", "itinerary", "landing_page", "case_study", "off_plan"]);
const ContentStatusEnum = z.enum(["draft", "in_review", "approved", "scheduled", "published"]);
const UserRoleEnum = z.enum(["admin", "editor", "author", "contributor", "viewer"]);

const UserSchema = z.object({
  id: z.string().uuid().openapi({ description: "User ID" }),
  username: z.string().nullable().openapi({ description: "Username for login" }),
  email: z.string().email().nullable().openapi({ description: "Email address" }),
  name: z.string().nullable().openapi({ description: "Display name" }),
  firstName: z.string().nullable().openapi({ description: "First name" }),
  lastName: z.string().nullable().openapi({ description: "Last name" }),
  profileImageUrl: z.string().url().nullable().openapi({ description: "Profile image URL" }),
  role: UserRoleEnum.openapi({ description: "User role" }),
  isActive: z.boolean().openapi({ description: "Account active status" }),
  totpEnabled: z.boolean().openapi({ description: "Two-factor authentication enabled" }),
  createdAt: z.string().datetime().nullable().openapi({ description: "Creation timestamp" }),
  updatedAt: z.string().datetime().nullable().openapi({ description: "Last update timestamp" }),
}).openapi("User");

const UserCreateSchema = z.object({
  username: z.string().min(3).max(50).openapi({ description: "Username (3-50 chars)" }),
  email: z.string().email().openapi({ description: "Email address" }),
  password: z.string().min(8).openapi({ description: "Password (min 8 chars)" }),
  name: z.string().optional().openapi({ description: "Display name" }),
  firstName: z.string().optional().openapi({ description: "First name" }),
  lastName: z.string().optional().openapi({ description: "Last name" }),
  role: UserRoleEnum.default("editor").openapi({ description: "User role" }),
}).openapi("UserCreate");

const UserUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: UserRoleEnum.optional(),
  isActive: z.boolean().optional(),
}).openapi("UserUpdate");

const ContentBlockSchema = z.object({
  id: z.string().openapi({ description: "Block ID" }),
  type: z.string().openapi({ description: "Block type (text, image, video, quote, etc.)" }),
  content: z.any().openapi({ description: "Block content (varies by type)" }),
  order: z.number().int().optional().openapi({ description: "Block order" }),
}).openapi("ContentBlock");

const ContentSchema = z.object({
  id: z.string().uuid().openapi({ description: "Content ID" }),
  type: ContentTypeEnum.openapi({ description: "Content type" }),
  status: ContentStatusEnum.openapi({ description: "Publication status" }),
  title: z.string().openapi({ description: "Content title" }),
  slug: z.string().openapi({ description: "URL-friendly slug" }),
  metaTitle: z.string().nullable().openapi({ description: "SEO meta title" }),
  metaDescription: z.string().nullable().openapi({ description: "SEO meta description" }),
  primaryKeyword: z.string().nullable().openapi({ description: "Primary SEO keyword" }),
  secondaryKeywords: z.array(z.string()).nullable().openapi({ description: "Secondary keywords" }),
  lsiKeywords: z.array(z.string()).nullable().openapi({ description: "LSI keywords" }),
  heroImage: z.string().nullable().openapi({ description: "Hero image URL" }),
  heroImageAlt: z.string().nullable().openapi({ description: "Hero image alt text" }),
  blocks: z.array(ContentBlockSchema).nullable().openapi({ description: "Content blocks" }),
  seoSchema: z.record(z.any()).nullable().openapi({ description: "Structured data schema" }),
  seoScore: z.number().int().nullable().openapi({ description: "SEO score (0-100)" }),
  answerCapsule: z.string().nullable().openapi({ description: "AEO answer capsule (40-60 words)" }),
  aeoScore: z.number().int().nullable().openapi({ description: "AEO optimization score" }),
  wordCount: z.number().int().nullable().openapi({ description: "Word count" }),
  viewCount: z.number().int().nullable().openapi({ description: "View count" }),
  authorId: z.string().uuid().nullable().openapi({ description: "Author user ID" }),
  writerId: z.string().uuid().nullable().openapi({ description: "AI writer ID" }),
  generatedByAI: z.boolean().nullable().openapi({ description: "AI-generated flag" }),
  intent: z.enum(["informational", "commercial", "transactional", "navigational"]).nullable().openapi({ description: "Content intent" }),
  parentId: z.string().uuid().nullable().openapi({ description: "Parent content ID" }),
  canonicalContentId: z.string().uuid().nullable().openapi({ description: "Canonical content ID" }),
  scheduledAt: z.string().datetime().nullable().openapi({ description: "Scheduled publish time" }),
  publishedAt: z.string().datetime().nullable().openapi({ description: "Actual publish time" }),
  createdAt: z.string().datetime().nullable().openapi({ description: "Creation timestamp" }),
  updatedAt: z.string().datetime().nullable().openapi({ description: "Last update timestamp" }),
}).openapi("Content");

const ContentCreateSchema = z.object({
  type: ContentTypeEnum.openapi({ description: "Content type" }),
  title: z.string().min(1).openapi({ description: "Content title" }),
  slug: z.string().optional().openapi({ description: "URL slug (auto-generated if not provided)" }),
  status: ContentStatusEnum.default("draft").openapi({ description: "Publication status" }),
  metaTitle: z.string().optional().openapi({ description: "SEO meta title" }),
  metaDescription: z.string().optional().openapi({ description: "SEO meta description" }),
  primaryKeyword: z.string().optional().openapi({ description: "Primary SEO keyword" }),
  secondaryKeywords: z.array(z.string()).optional().openapi({ description: "Secondary keywords" }),
  heroImage: z.string().optional().openapi({ description: "Hero image URL" }),
  heroImageAlt: z.string().optional().openapi({ description: "Hero image alt text" }),
  blocks: z.array(ContentBlockSchema).optional().openapi({ description: "Content blocks" }),
  answerCapsule: z.string().optional().openapi({ description: "AEO answer capsule" }),
  intent: z.enum(["informational", "commercial", "transactional", "navigational"]).optional(),
  parentId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
}).openapi("ContentCreate");

const ContentUpdateSchema = ContentCreateSchema.partial().openapi("ContentUpdate");

const MediaFileSchema = z.object({
  id: z.string().uuid().openapi({ description: "Media file ID" }),
  filename: z.string().openapi({ description: "Original filename" }),
  mimeType: z.string().openapi({ description: "MIME type" }),
  size: z.number().int().openapi({ description: "File size in bytes" }),
  url: z.string().url().openapi({ description: "Public URL" }),
  alt: z.string().nullable().openapi({ description: "Alt text for accessibility" }),
  caption: z.string().nullable().openapi({ description: "Caption" }),
  width: z.number().int().nullable().openapi({ description: "Image width" }),
  height: z.number().int().nullable().openapi({ description: "Image height" }),
  uploadedBy: z.string().uuid().nullable().openapi({ description: "Uploader user ID" }),
  createdAt: z.string().datetime().nullable().openapi({ description: "Upload timestamp" }),
}).openapi("MediaFile");

const MediaUpdateSchema = z.object({
  alt: z.string().optional().openapi({ description: "Alt text" }),
  caption: z.string().optional().openapi({ description: "Caption" }),
}).openapi("MediaUpdate");

const LoginRequestSchema = z.object({
  username: z.string().openapi({ description: "Username or email" }),
  password: z.string().openapi({ description: "Password" }),
}).openapi("LoginRequest");

const LoginResponseSchema = z.object({
  user: UserSchema.omit({ passwordHash: true } as any),
  requiresTotp: z.boolean().optional().openapi({ description: "Requires TOTP verification" }),
  preAuthToken: z.string().optional().openapi({ description: "Pre-auth token for TOTP flow" }),
}).openapi("LoginResponse");

const TotpVerifySchema = z.object({
  preAuthToken: z.string().openapi({ description: "Pre-auth token from login" }),
  totpCode: z.string().length(6).openapi({ description: "6-digit TOTP code" }),
}).openapi("TotpVerify");

registry.register("Error", ErrorSchema);
registry.register("User", UserSchema);
registry.register("UserCreate", UserCreateSchema);
registry.register("UserUpdate", UserUpdateSchema);
registry.register("Content", ContentSchema);
registry.register("ContentCreate", ContentCreateSchema);
registry.register("ContentUpdate", ContentUpdateSchema);
registry.register("ContentBlock", ContentBlockSchema);
registry.register("MediaFile", MediaFileSchema);
registry.register("MediaUpdate", MediaUpdateSchema);
registry.register("LoginRequest", LoginRequestSchema);
registry.register("LoginResponse", LoginResponseSchema);
registry.register("TotpVerify", TotpVerifySchema);

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Authentication"],
  summary: "Login with username and password",
  description: "Authenticate with username/email and password. Returns user info and sets session cookie. May require TOTP verification.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: LoginResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    429: {
      description: "Too many login attempts",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/totp/verify",
  tags: ["Authentication"],
  summary: "Verify TOTP code",
  description: "Complete login by verifying a TOTP code (for accounts with 2FA enabled)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TotpVerifySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "TOTP verified, session created",
      content: {
        "application/json": {
          schema: z.object({
            user: UserSchema,
            message: z.string(),
          }),
        },
      },
    },
    401: {
      description: "Invalid or expired TOTP code",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Authentication"],
  summary: "Logout current user",
  description: "Destroy current session and clear session cookie",
  responses: {
    200: {
      description: "Logout successful",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/user",
  tags: ["Authentication"],
  summary: "Get current user",
  description: "Get the currently authenticated user's profile and permissions",
  security: [{ sessionAuth: [] }],
  responses: {
    200: {
      description: "Current user info",
      content: {
        "application/json": {
          schema: z.object({
            user: UserSchema,
            permissions: z.record(z.boolean()),
          }),
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/magic-link",
  tags: ["Authentication"],
  summary: "Request magic link",
  description: "Send a passwordless login link to the specified email address",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Magic link sent",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    429: {
      description: "Rate limited",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contents",
  tags: ["Contents"],
  summary: "List all content",
  description: "Get paginated list of content with optional filtering by type and status",
  security: [{ sessionAuth: [] }],
  request: {
    query: z.object({
      type: ContentTypeEnum.optional().openapi({ description: "Filter by content type" }),
      status: ContentStatusEnum.optional().openapi({ description: "Filter by status" }),
      search: z.string().optional().openapi({ description: "Search in title" }),
      page: z.string().optional().openapi({ description: "Page number" }),
      limit: z.string().optional().openapi({ description: "Items per page (max 100)" }),
    }),
  },
  responses: {
    200: {
      description: "List of content items",
      content: {
        "application/json": {
          schema: z.object({
            contents: z.array(ContentSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contents/{id}",
  tags: ["Contents"],
  summary: "Get content by ID",
  description: "Get a single content item with all associated data",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
  },
  responses: {
    200: {
      description: "Content item",
      content: {
        "application/json": {
          schema: ContentSchema,
        },
      },
    },
    404: {
      description: "Content not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contents/slug/{slug}",
  tags: ["Contents"],
  summary: "Get content by slug",
  description: "Get a single content item by its URL slug (public endpoint)",
  request: {
    params: z.object({
      slug: z.string().openapi({ description: "Content slug" }),
    }),
  },
  responses: {
    200: {
      description: "Content item",
      content: {
        "application/json": {
          schema: ContentSchema,
        },
      },
    },
    404: {
      description: "Content not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contents",
  tags: ["Contents"],
  summary: "Create new content",
  description: "Create a new content item. Requires 'canCreate' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ContentCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Content created",
      content: {
        "application/json": {
          schema: ContentSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/contents/{id}",
  tags: ["Contents"],
  summary: "Update content",
  description: "Update an existing content item. Requires 'canEdit' permission or ownership.",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: ContentUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Content updated",
      content: {
        "application/json": {
          schema: ContentSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Content not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/contents/{id}",
  tags: ["Contents"],
  summary: "Delete content",
  description: "Soft-delete a content item. Requires 'canDelete' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
  },
  responses: {
    200: {
      description: "Content deleted",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Content not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contents/{id}/versions",
  tags: ["Contents"],
  summary: "Get content versions",
  description: "Get version history for a content item",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
  },
  responses: {
    200: {
      description: "List of versions",
      content: {
        "application/json": {
          schema: z.array(z.object({
            id: z.string().uuid(),
            contentId: z.string().uuid(),
            version: z.number().int(),
            data: z.record(z.any()),
            createdBy: z.string().uuid().nullable(),
            createdAt: z.string().datetime(),
          })),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contents/{id}/versions/{versionId}/restore",
  tags: ["Contents"],
  summary: "Restore content version",
  description: "Restore content to a previous version",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
      versionId: z.string().uuid().openapi({ description: "Version ID to restore" }),
    }),
  },
  responses: {
    200: {
      description: "Version restored",
      content: {
        "application/json": {
          schema: ContentSchema,
        },
      },
    },
    404: {
      description: "Content or version not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/contents/{id}/translations",
  tags: ["Contents"],
  summary: "Get content translations",
  description: "Get all translations for a content item",
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
  },
  responses: {
    200: {
      description: "List of translations",
      content: {
        "application/json": {
          schema: z.array(z.object({
            id: z.string().uuid(),
            contentId: z.string().uuid(),
            locale: z.string(),
            title: z.string(),
            metaTitle: z.string().nullable(),
            metaDescription: z.string().nullable(),
            blocks: z.array(z.any()).nullable(),
            status: z.string(),
            createdAt: z.string().datetime(),
          })),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/contents/{id}/translate-all",
  tags: ["Contents"],
  summary: "Translate content to all locales",
  description: "Queue translations for a content item to all supported locales",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Content ID" }),
    }),
  },
  responses: {
    202: {
      description: "Translation jobs queued",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            locales: z.array(z.string()),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users",
  tags: ["Users"],
  summary: "List all users",
  description: "Get list of all users. Requires 'canManageUsers' permission.",
  security: [{ sessionAuth: [] }],
  responses: {
    200: {
      description: "List of users",
      content: {
        "application/json": {
          schema: z.array(UserSchema),
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users",
  tags: ["Users"],
  summary: "Create new user",
  description: "Create a new user account. Requires 'canManageUsers' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UserCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created",
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
    },
    400: {
      description: "Validation error or username/email already exists",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/{id}",
  tags: ["Users"],
  summary: "Update user",
  description: "Update user details. Requires 'canManageUsers' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "User ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UserUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User updated",
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/users/{id}",
  tags: ["Users"],
  summary: "Delete user",
  description: "Delete a user account. Requires 'canManageUsers' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "User ID" }),
    }),
  },
  responses: {
    200: {
      description: "User deleted",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: "Cannot delete yourself or permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/media",
  tags: ["Media"],
  summary: "List media files",
  description: "Get list of all uploaded media files. Requires 'canAccessMediaLibrary' permission.",
  security: [{ sessionAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: "Search in filename" }),
      type: z.string().optional().openapi({ description: "Filter by MIME type prefix (e.g., 'image')" }),
    }),
  },
  responses: {
    200: {
      description: "List of media files",
      content: {
        "application/json": {
          schema: z.array(MediaFileSchema),
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/media/{id}",
  tags: ["Media"],
  summary: "Get media file",
  description: "Get a single media file by ID",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Media file ID" }),
    }),
  },
  responses: {
    200: {
      description: "Media file details",
      content: {
        "application/json": {
          schema: MediaFileSchema,
        },
      },
    },
    404: {
      description: "Media file not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/media/upload",
  tags: ["Media"],
  summary: "Upload media file",
  description: "Upload a new media file. Supports images (JPG, PNG, GIF, WebP) and documents (PDF). Max 10MB.",
  security: [{ sessionAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({ 
              description: "File to upload",
              format: "binary",
            }),
            alt: z.string().optional().openapi({ description: "Alt text" }),
            caption: z.string().optional().openapi({ description: "Caption" }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "File uploaded",
      content: {
        "application/json": {
          schema: MediaFileSchema,
        },
      },
    },
    400: {
      description: "Invalid file type or size",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: "Permission denied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/media/{id}",
  tags: ["Media"],
  summary: "Update media metadata",
  description: "Update alt text and caption for a media file",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Media file ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: MediaUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Media updated",
      content: {
        "application/json": {
          schema: MediaFileSchema,
        },
      },
    },
    404: {
      description: "Media file not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/media/{id}",
  tags: ["Media"],
  summary: "Delete media file",
  description: "Delete a media file from storage",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Media file ID" }),
    }),
  },
  responses: {
    200: {
      description: "Media deleted",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: "Media file not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/media/{id}/usage",
  tags: ["Media"],
  summary: "Get media usage",
  description: "Get list of content items using this media file",
  security: [{ sessionAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: "Media file ID" }),
    }),
  },
  responses: {
    200: {
      description: "Usage information",
      content: {
        "application/json": {
          schema: z.object({
            usedIn: z.array(z.object({
              contentId: z.string().uuid(),
              contentTitle: z.string(),
              field: z.string(),
            })),
          }),
        },
      },
    },
  },
});

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "TRAVI CMS API",
      version: "1.0.0",
      description: `
# TRAVI Content Management System API

Welcome to the TRAVI CMS API documentation. This API powers the TRAVI travel content platform.

## Authentication

Most API endpoints require authentication. TRAVI uses session-based authentication with optional two-factor authentication (TOTP).

### Login Flow
1. POST /api/auth/login with username and password
2. If TOTP is enabled, you'll receive a \`preAuthToken\` - use it with POST /api/auth/totp/verify
3. On success, a session cookie (\`connect.sid\`) is set

### Permissions
Users have role-based permissions:
- **admin**: Full access to all features
- **editor**: Can create, edit, and publish content
- **author**: Can create and edit own content
- **contributor**: Can create content and submit for review
- **viewer**: Read-only access

## Rate Limiting
- Authentication endpoints: 5 requests per minute
- Content write operations: 30 requests per minute
- General API: 100 requests per minute

## Error Handling
All errors return a JSON object with an \`error\` field and optional \`details\` array for validation errors.
      `,
      contact: {
        name: "TRAVI Support",
        url: "https://travi.world",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "Login, logout, and session management",
      },
      {
        name: "Contents",
        description: "Content CRUD operations (articles, attractions, hotels, etc.)",
      },
      {
        name: "Users",
        description: "User management (admin only)",
      },
      {
        name: "Media",
        description: "Media file upload and management",
      },
    ],
  });
}

export { registry };
