/**
 * Standardized Pagination Helper
 *
 * Provides a single pagination pattern for all API endpoints.
 * Supports page-based pagination (page/pageSize) with consistent
 * response metadata. Offset-based callers can still pass offset/limit
 * and get the same standardized response envelope.
 */

import type { Request } from "express";

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================================================
// PARSE
// ============================================================================

/**
 * Extract and validate pagination parameters from a request.
 *
 * Accepts either `page`/`pageSize` or legacy `offset`/`limit` query params.
 * Returns a normalized `PaginationParams` object.
 *
 * @param req   Express request
 * @param opts  Optional overrides for defaults and max page size
 */
export function parsePagination(
  req: Request,
  opts?: { defaultPageSize?: number; maxPageSize?: number }
): PaginationParams {
  const maxSize = opts?.maxPageSize ?? MAX_PAGE_SIZE;
  const defaultSize = opts?.defaultPageSize ?? DEFAULT_PAGE_SIZE;

  // Support both naming conventions
  const rawPage = req.query.page as string | undefined;
  const rawPageSize = (req.query.pageSize ?? req.query.page_size) as string | undefined;
  const rawOffset = req.query.offset as string | undefined;
  const rawLimit = req.query.limit as string | undefined;

  let page: number;
  let pageSize: number;

  if (rawPage !== undefined) {
    // Page-based: ?page=2&pageSize=20
    page = Math.max(1, Number.parseInt(rawPage, 10) || DEFAULT_PAGE);
    pageSize = Math.min(
      maxSize,
      Math.max(1, Number.parseInt(rawPageSize || "", 10) || defaultSize)
    );
  } else if (rawOffset !== undefined || rawLimit !== undefined) {
    // Legacy offset-based: ?offset=40&limit=20
    const offset = Math.max(0, Number.parseInt(rawOffset || "0", 10) || 0);
    pageSize = Math.min(maxSize, Math.max(1, Number.parseInt(rawLimit || "", 10) || defaultSize));
    page = Math.floor(offset / pageSize) + 1;
  } else {
    page = DEFAULT_PAGE;
    pageSize = defaultSize;
  }

  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

// ============================================================================
// META
// ============================================================================

/**
 * Build a standardized pagination metadata block.
 *
 * @param total     Total number of records matching the query
 * @param params    The pagination params used for the query
 */
export function paginationMeta(total: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * Build a complete paginated response envelope.
 *
 * @param data    The page of results
 * @param total   Total number of records matching the query
 * @param params  The pagination params used for the query
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    pagination: paginationMeta(total, params),
  };
}
