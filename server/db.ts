import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { log } from "./lib/logger";

const { Pool } = pg;

// Use Replit's DATABASE_URL as primary (has synced schema), Railway as fallback
const databaseUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or RAILWAY_DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Log which database is being used (without exposing credentials)
const dbSource = process.env.DATABASE_URL ? "Replit" : "Railway";
log.info(`[DB] Using ${dbSource} PostgreSQL database`);

// Connection pool configuration - optimized for production workloads
// Railway PostgreSQL supports up to 97 connections (100 - 3 reserved)
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 15, // Production pool size for concurrent queries
  min: 2, // Keep minimum connections ready
  idleTimeoutMillis: 30000, // Release idle connections after 30s
  connectionTimeoutMillis: 10000, // Allow time to connect
  allowExitOnIdle: true, // Allow process to exit when pool is idle
  // SSL configuration - Replit Neon and Railway both support SSL
  ssl: { rejectUnauthorized: false },
});

// Handle pool errors gracefully - log but don't crash
pool.on("error", (err: Error) => {
  log.error("[DB Pool Error]", err);
  // Don't exit - pool can recover from transient errors
});

// Graceful shutdown - release all connections when process exits
const shutdown = async () => {
  await pool.end();

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export const db = drizzle(pool, { schema });
