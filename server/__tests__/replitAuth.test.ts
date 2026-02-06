/**
 * Tests for isAuthenticated middleware
 *
 * Tests the Express middleware that guards protected routes,
 * including DEV_AUTO_AUTH bypass, token expiry, and unauthenticated access.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Mock external dependencies before importing the module under test
vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  refreshTokenGrant: vi.fn(),
  buildEndSessionUrl: vi.fn(),
}));

vi.mock("openid-client/passport", () => ({
  Strategy: vi.fn(),
}));

vi.mock("passport", () => ({
  default: {
    initialize: vi.fn(() => (req: any, res: any, next: any) => next()),
    session: vi.fn(() => (req: any, res: any, next: any) => next()),
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    authenticate: vi.fn(),
  },
}));

vi.mock("express-session", () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock("memoizee", () => ({
  default: (fn: Function) => fn,
}));

vi.mock("connect-pg-simple", () => ({
  default: vi.fn(() => vi.fn().mockImplementation(() => ({}))),
}));

vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    upsertUser: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({}),
  },
}));

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    user: undefined,
    isAuthenticated: () => false,
    ...overrides,
  };
}

function createMockRes() {
  const state = { statusCode: null as number | null, jsonBody: null as any };
  const res: Partial<Response> = {};
  res.status = vi.fn((code: number) => {
    state.statusCode = code;
    return res as Response;
  }) as any;
  res.json = vi.fn((body: any) => {
    state.jsonBody = body;
    return res as Response;
  }) as any;
  return { res, state };
}

describe("isAuthenticated middleware", () => {
  let isAuthenticated: any;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    // Reset env vars
    delete process.env.DEV_AUTO_AUTH;
    process.env.NODE_ENV = "test";

    const mod = await import("../replitAuth");
    isAuthenticated = mod.isAuthenticated;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = createMockReq({
      isAuthenticated: () => false,
      user: undefined,
    });
    const { res, state } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when isAuthenticated function is missing on req", async () => {
    const req = createMockReq();
    // Simulate missing isAuthenticated function
    delete (req as any).isAuthenticated;
    const { res, state } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when req.user has no expires_at and no claims.sub", async () => {
    const req = createMockReq({
      isAuthenticated: () => true,
      user: {} as any, // no claims, no expires_at
    });
    const { res, state } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() for password-based login (claims.sub but no expires_at)", async () => {
    const req = createMockReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "user-123" },
      } as any,
    });
    const { res } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next() when OIDC token is not expired", async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
    const req = createMockReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "user-123" },
        expires_at: futureTimestamp,
      } as any,
    });
    const { res } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when OIDC token is expired and no refresh token", async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const req = createMockReq({
      isAuthenticated: () => true,
      user: {
        claims: { sub: "user-123" },
        expires_at: pastTimestamp,
        // no refresh_token
      } as any,
    });
    const { res, state } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("activates DEV_AUTO_AUTH bypass in non-production environment", async () => {
    vi.resetModules();
    process.env.DEV_AUTO_AUTH = "true";
    process.env.NODE_ENV = "development";

    const mod = await import("../replitAuth");
    isAuthenticated = mod.isAuthenticated;

    const req = createMockReq({
      isAuthenticated: () => false,
      user: undefined,
    });
    const { res } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    // Should inject dev admin user
    expect((req as any).user).toBeDefined();
    expect((req as any).user.role).toBe("admin");
    expect((req as any).user.claims.sub).toBe("1c932a80-c8c1-4ca5-b4f3-de09914947ba");
  });

  it("does NOT activate DEV_AUTO_AUTH bypass in production", async () => {
    vi.resetModules();
    process.env.DEV_AUTO_AUTH = "true";
    process.env.NODE_ENV = "production";

    const mod = await import("../replitAuth");
    isAuthenticated = mod.isAuthenticated;

    const req = createMockReq({
      isAuthenticated: () => false,
      user: undefined,
    });
    const { res, state } = createMockRes();
    const next = vi.fn();

    await isAuthenticated(req as Request, res as Response, next as NextFunction);

    // Should NOT bypass - should return 401
    expect(state.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
