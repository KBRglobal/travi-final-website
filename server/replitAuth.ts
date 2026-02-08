import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";

// Ensure session table exists
async function ensureSessionTable(): Promise<void> {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);
    `;
    await pool.query(createTableSQL);
  } catch {
    void 0;
  }
}

// Initialize session table on module load
await ensureSessionTable();

// Only attempt OIDC discovery when running inside Replit (REPL_ID exists)
const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) return null;
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      return null;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  // SECURITY: Session TTL - balance between security and usability
  // 8 hours for a typical work day
  const sessionTtl = 8 * 60 * 60 * 1000; // 8 hours (reduced from 24 hours for better security)
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // In development, use sameSite: "none" to allow cross-origin cookie sharing for Playwright tests
  // In production, use sameSite: "lax" for security
  const isDev = process.env.NODE_ENV !== "production";

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // In development, secure:false allows cookies over HTTP for localhost testing
      // In production, secure:true requires HTTPS
      secure: !isDev,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

interface UserSession {
  claims?: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface OIDCClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  exp?: number;
}

function updateUserSession(
  user: UserSession,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims() as Record<string, unknown>;
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = (user.claims?.exp as number) ?? undefined;
}

async function upsertUser(claims: OIDCClaims) {
  // Check if user exists to preserve their role, otherwise default to viewer (least privilege)
  const existingUser = await storage.getUser(claims["sub"]);
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: existingUser?.role || "viewer",
  });
}

/**
 * setupAuth - Configures authentication for the Express app.
 *
 * STANDALONE MODE (default when no REPL_ID):
 *   - Session + Passport are initialized by the caller (routes.ts lines 463-469)
 *   - /api/login redirects to /login (React SPA login page)
 *   - /api/auth/login handles username/password (registered in auth-routes.ts)
 *   - /api/logout destroys session and redirects to /
 *
 * REPLIT FALLBACK (only when REPL_ID env var exists):
 *   - Replit OIDC is configured as an additional Passport strategy
 *   - /api/login triggers OIDC flow
 *   - /api/callback handles OIDC response
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  // NOTE: Session and Passport middleware are initialized by the caller (routes.ts)
  // to avoid double-initialization. Do NOT add app.use(getSession()) here.

  const config = await getOidcConfig();

  if (!config) {
    // No OIDC config available - either not on Replit or OIDC discovery failed.
    // Standalone auth (/api/auth/login) is registered in auth-routes.ts.
    // These routes handle the legacy /api/login and /api/logout paths.

    app.get("/api/login", (_req, res) => {
      // Redirect to the SPA login page instead of showing a 503 error
      res.redirect("/login");
    });

    app.get("/api/callback", (_req, res) => {
      res.redirect("/login");
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        req.session?.destroy(() => {
          res.clearCookie("connect.sid");
          res.redirect("/");
        });
      });
    });

    // Access denied info endpoint (available in both modes)
    app.get("/api/access-denied-info", (_req, res) => {
      res.json({
        error: "Access denied",
        message: "This application is restricted to authorized administrators only.",
      });
    });

    return;
  }

  // =====================================================================
  // REPLIT OIDC MODE: Full OIDC strategy registration (only when REPL_ID exists)
  // =====================================================================
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("Authentication claims are required."), undefined);
    }

    // STRICT ACCESS RESTRICTION: Only allow specific admin emails or GitHub usernames
    const ALLOWED_EMAILS = ["traviquackson@gmail.com", "mzgdubai@gmail.com"];
    const ALLOWED_USERNAMES = ["kbrglobal"];

    const email = (claims["email"] as string | undefined)?.toLowerCase() || "";

    // Get username from multiple possible claim fields
    const username = (claims["preferred_username"] ||
      claims["nickname"] ||
      claims["name"] ||
      claims["sub"] ||
      "") as string;

    const emailAllowed = email && ALLOWED_EMAILS.some(e => e.toLowerCase() === email);
    const usernameAllowed =
      username && ALLOWED_USERNAMES.some(u => u.toLowerCase() === username.toLowerCase());

    // Allow login if EITHER email OR username is authorized
    if (!emailAllowed && !usernameAllowed) {
      return verified(
        new Error(`Access denied. You are not authorized to access this application.`),
        undefined
      );
    }

    // Check if user exists and is active (only if email is provided)
    if (email) {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && !existingUser.isActive) {
        return verified(
          new Error("Your account has been deactivated. Please contact an administrator."),
          undefined
        );
      }
    }

    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(
      `replitauth:${req.hostname}`,
      (err: Error | null, user: Express.User | false | null) => {
        if (err || !user) {
          // Redirect to access denied page with error message
          return res.redirect("/access-denied");
        }
        req.logIn(user, loginErr => {
          if (loginErr) {
            return res.redirect("/access-denied");
          }
          return res.redirect("/");
        });
      }
    )(req, res, next);
  });

  // Access denied page
  app.get("/api/access-denied-info", (_req, res) => {
    res.json({
      error: "Access denied",
      message: "This application is restricted to authorized administrators only.",
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // DEV_AUTO_AUTH bypass for development - use real admin user from database
  if (process.env.DEV_AUTO_AUTH === "true" && process.env.NODE_ENV !== "production") {
    const devAdminId = "1c932a80-c8c1-4ca5-b4f3-de09914947ba"; // admin@local.admin
    (req as any).user = {
      id: devAdminId,
      claims: { sub: devAdminId },
      role: "admin",
    };
    (req as any).isAuthenticated = () => true;
    return next();
  }

  const user = req.user as any;

  // Check if passport is initialized and user is authenticated
  if (typeof req.isAuthenticated !== "function" || !req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For password-based login (standalone auth - PRIMARY path),
  // user has id and claims.sub but no expires_at.
  // Allow these users through without token refresh check.
  if (!user.expires_at && user.claims?.sub) {
    return next();
  }

  // For OIDC login (Replit fallback), check token expiration
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // OIDC token expired - attempt refresh (only works inside Replit)
  const refreshToken = user.refresh_token;
  if (!refreshToken || !process.env.REPL_ID) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
