import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Prefer Railway database if available, otherwise fall back to Replit's DATABASE_URL
const databaseUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "RAILWAY_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Log which database is being used (without exposing credentials)
const dbSource = process.env.RAILWAY_DATABASE_URL ? "Railway" : "Replit";
console.log(`[DB] Using ${dbSource} PostgreSQL database`);

// Connection pool configuration - optimized for production workloads
// Railway PostgreSQL supports up to 97 connections (100 - 3 reserved)
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 15, // Production pool size for concurrent queries
  min: 2, // Keep minimum connections ready
  idleTimeoutMillis: 30000, // Release idle connections after 30s
  connectionTimeoutMillis: 10000, // Allow time to connect
  allowExitOnIdle: true, // Allow process to exit when pool is idle
  // SSL required for Railway connection
  ssl: process.env.RAILWAY_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

// Handle pool errors gracefully - log but don't crash
pool.on("error", (err: Error) => {
  console.error("[DB Pool Error]", err.message || err);
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
