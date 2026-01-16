import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Prefer Railway database if available, otherwise fall back to Replit's DATABASE_URL
const databaseUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "RAILWAY_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log which database is being used (without exposing credentials)
const dbSource = process.env.RAILWAY_DATABASE_URL ? "Railway" : "Replit";
console.log(`[DB] Connecting to ${dbSource} PostgreSQL database`);

// Connection pool configuration - minimal connections to leave room for Replit migration validator
// During publishing, Replit's validator needs to connect to check database schema
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 3,                         // Minimal pool - leaves capacity for Replit publish validator
  min: 0,                         // Allow pool to fully drain when idle
  idleTimeoutMillis: 10000,       // Release idle connections quickly (10s)
  connectionTimeoutMillis: 10000, // Allow more time to connect
  allowExitOnIdle: true,          // Allow process to exit when pool is idle
  // SSL required for Railway connection
  ssl: process.env.RAILWAY_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Graceful shutdown - release all connections when process exits
const shutdown = async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed.');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export const db = drizzle(pool, { schema });
