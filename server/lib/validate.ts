import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, z } from "zod";

/**
 * Validation middleware factory
 * Creates an Express middleware that validates request data against Zod schemas
 */
interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validation middleware for Express routes
 *
 * @example
 * ```typescript
 * import { validate, paginationSchema, idParamSchema } from '@/lib/validate';
 *
 * router.get('/:id',
 *   validate({ params: idParamSchema }),
 *   asyncHandler(async (req, res) => {
 *     // req.params.id is validated as UUID
 *   })
 * );
 *
 * router.post('/',
 *   validate({ body: insertContentSchema }),
 *   asyncHandler(async (req, res) => {
 *     // req.body is now validated and typed
 *   })
 * );
 * ```
 */
export function validate(schemas: ValidateOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as typeof req.query;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

// Common validation schemas

/**
 * Pagination query parameters schema
 * Validates: page (min 1), limit (1-100), sort, order (asc/desc)
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * UUID parameter schema
 * Validates that :id is a valid UUID format
 */
export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

/**
 * Slug parameter schema
 * Validates that :slug is a valid URL slug
 */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

/**
 * Search query schema
 * Validates search-related query parameters
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  type: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  ...paginationSchema.shape,
});

/**
 * Date range query schema
 * Validates date range parameters for filtering
 */
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    data => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    { message: "startDate must be before or equal to endDate" }
  );

/**
 * Async handler wrapper for Express routes
 * Automatically catches Promise rejections and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error classes for operational errors
 */
export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(resource: string = "Resource") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;

  constructor(message: string = "Resource conflict") {
    super(message);
    this.name = "ConflictError";
  }
}
