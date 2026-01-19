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
    console.log('[Session] Table verified/created successfully');
  } catch (error) {
    console.error('[Session] Failed to ensure table exists:', error);
  }
}

// Initialize session table on module load
ensureSessionTable();

const getOidcConfig = memoize(
  async () => {
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("[Auth] OIDC discovery failed, auth will be disabled:", error instanceof Error ? error.message : error);
      return null;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours (reduced from 7 days for security)
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
    resave: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // In development, secure:false allows cookies over HTTP for localhost testing
      // In production, secure:true requires HTTPS
      secure: !isDev,
      sameSite: isDev ? "lax" : "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user exists to preserve their role, otherwise default to admin for new OIDC users
  const existingUser = await storage.getUser(claims["sub"]);
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: existingUser?.role || "admin",
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();
  
  if (!config) {
    console.warn("[Auth] OIDC config unavailable - auth routes will return 503");
    
    app.get("/api/login", (req, res) => {
      res.status(503).json({ error: "Authentication service temporarily unavailable" });
    });
    
    app.get("/api/callback", (req, res) => {
      res.status(503).json({ error: "Authentication service temporarily unavailable" });
    });
    
    app.get("/api/logout", (req, res) => {
      res.redirect("/");
    });
    
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user: Express.User, done) => done(null, user));
    
    return;
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      console.log(`Login rejected: no claims provided`);
      return verified(new Error("Authentication claims are required."), undefined);
    }
    
    const email = claims["email"] as string | undefined;
    
    if (!email) {
      console.log(`Login rejected: no email provided`);
      return verified(new Error("Email is required for login."), undefined);
    }
    
    // Check if user exists and is active
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser && !existingUser.isActive) {
      console.log(`Login rejected for deactivated user: ${email}`);
      return verified(new Error("Your account has been deactivated. Please contact an administrator."), undefined);
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
        verify,
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
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        // Redirect to access denied page with error message
        return res.redirect("/access-denied");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.redirect("/access-denied");
        }
        return res.redirect("/");
      });
    })(req, res, next);
  });

  // Access denied page
  app.get("/api/access-denied-info", (req, res) => {
    res.json({ 
      error: "Access denied", 
      message: "This application is restricted to authorized users only.",
      allowedEmail: "traviquackson@gmail.com"
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
  if (process.env.DEV_AUTO_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    const devAdminId = '1c932a80-c8c1-4ca5-b4f3-de09914947ba'; // admin@local.admin
    (req as any).user = {
      id: devAdminId,
      claims: { sub: devAdminId },
      role: 'admin'
    };
    (req as any).isAuthenticated = () => true;
    return next();
  }

  const user = req.user as any;

  // Check if passport is initialized and user is authenticated
  if (typeof req.isAuthenticated !== 'function' || !req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For password-based login, user has id and claims.sub but no expires_at
  // Allow these users through without token refresh check
  if (!user.expires_at && user.claims?.sub) {
    return next();
  }

  // For OIDC login, check token expiration
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
