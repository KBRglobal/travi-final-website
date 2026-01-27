/**
 * Database Restore Script
 * Restores PostgreSQL database from compressed backup
 *
 * Usage:
 *   npx tsx server/scripts/restore-db.ts backup-2024-01-15T10-30-00.sql.gz
 *   npx tsx server/scripts/restore-db.ts --latest
 *   npx tsx server/scripts/restore-db.ts --list
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import * as readline from "readline";

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
const DATABASE_URL = process.env.DATABASE_URL;

interface RestoreResult {
  success: boolean;
  filename?: string;
  duration?: number;
  error?: string;
}

/**
 * Parse PostgreSQL connection string
 */
function parseDbUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
  };
}

/**
 * Get list of available backups
 */
async function getBackupFiles(): Promise<{ name: string; path: string; time: number }[]> {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = await fs.promises.readdir(BACKUP_DIR);
  return files
    .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);
}

/**
 * List all backups
 */
async function listBackups(): Promise<void> {
  const backupFiles = await getBackupFiles();

  if (backupFiles.length === 0) {
  } else {
    backupFiles.forEach((f, i) => {
      const stats = fs.statSync(f.path);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const date = new Date(f.time).toISOString();
    });
  }
}

/**
 * Prompt user for confirmation
 */
async function confirmRestore(filename: string, database: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question("Type 'RESTORE' to confirm: ", answer => {
      rl.close();
      resolve(answer === "RESTORE");
    });
  });
}

/**
 * Restore database from backup
 */
async function restoreBackup(backupFilename: string, skipConfirm = false): Promise<RestoreResult> {
  const startTime = Date.now();

  if (!DATABASE_URL) {
    return { success: false, error: "DATABASE_URL not set" };
  }

  const backupPath = path.isAbsolute(backupFilename)
    ? backupFilename
    : path.join(BACKUP_DIR, backupFilename);

  if (!fs.existsSync(backupPath)) {
    return { success: false, error: `Backup file not found: ${backupPath}` };
  }

  try {
    const dbConfig = parseDbUrl(DATABASE_URL);

    // Confirm restore
    if (!skipConfirm) {
      const confirmed = await confirmRestore(backupFilename, dbConfig.database);
      if (!confirmed) {
        return { success: false, error: "Restore cancelled by user" };
      }
    }

    // Decompress backup
    const tempPath = path.join(BACKUP_DIR, `restore-temp-${Date.now()}.sql`);

    const source = fs.createReadStream(backupPath);
    const destination = fs.createWriteStream(tempPath);
    const gunzip = createGunzip();

    await pipeline(source, gunzip, destination);

    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: dbConfig.password };

    // Drop and recreate database connections, then restore

    // Terminate existing connections
    const terminateCmd = [
      "psql",
      `-h ${dbConfig.host}`,
      `-p ${dbConfig.port}`,
      `-U ${dbConfig.user}`,
      `-d postgres`,
      `-c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbConfig.database}' AND pid <> pg_backend_pid();"`,
    ].join(" ");

    try {
      await execAsync(terminateCmd, { env });
    } catch {
      // Ignore errors if no connections to terminate
    }

    // Restore using psql
    const restoreCmd = [
      "psql",
      `-h ${dbConfig.host}`,
      `-p ${dbConfig.port}`,
      `-U ${dbConfig.user}`,
      `-d ${dbConfig.database}`,
      `-f ${tempPath}`,
      "--quiet",
    ].join(" ");

    await execAsync(restoreCmd, { env });

    // Clean up temp file
    await fs.promises.unlink(tempPath);

    const duration = Date.now() - startTime;

    return {
      success: true,
      filename: backupFilename,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return { success: false, error: errorMessage };
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--list") || args.length === 0) {
    await listBackups();
    if (args.length === 0) {
    }
    return;
  }

  let backupFile: string;

  if (args.includes("--latest")) {
    const backups = await getBackupFiles();
    if (backups.length === 0) {
      process.exit(1);
    }
    backupFile = backups[0].name;
  } else {
    backupFile = args[0];
  }

  const result = await restoreBackup(backupFile);

  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(() => {});

export { restoreBackup, listBackups, getBackupFiles, RestoreResult };
