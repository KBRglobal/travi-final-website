#!/usr/bin/env node
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const FRONTEND_ONLY = process.env.FRONTEND_ONLY === "true";
const SKIP_PARITY_CHECK = process.env.SKIP_PARITY_CHECK === "true";

async function runTranslationParityCheck(): Promise<void> {
  if (SKIP_PARITY_CHECK) {
    console.log("[Build] Skipping translation parity check (SKIP_PARITY_CHECK=true)");
    return;
  }

  console.log("[Build] Running translation parity check...");
  
  const LOCALES_DIR = path.join(process.cwd(), "client/src/locales");
  const REFERENCE_LOCALE = "en";
  const TARGET_LOCALES = ["ar"];

  interface TranslationKeys {
    [key: string]: string | TranslationKeys;
  }

  function flattenKeys(obj: TranslationKeys, prefix = ""): string[] {
    const keys: string[] = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        keys.push(...flattenKeys(obj[key] as TranslationKeys, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  function loadTranslations(locale: string): TranslationKeys {
    const filePath = path.join(LOCALES_DIR, locale, "common.json");
    if (!fs.existsSync(filePath)) {
      throw new Error(`Locale file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  const referenceData = loadTranslations(REFERENCE_LOCALE);
  const referenceKeys = flattenKeys(referenceData);
  console.log(`  Reference (${REFERENCE_LOCALE}) has ${referenceKeys.length} keys`);

  let totalMissing = 0;
  let totalExtra = 0;

  for (const locale of TARGET_LOCALES) {
    const targetData = loadTranslations(locale);
    const targetKeys = flattenKeys(targetData);
    
    const missingInTarget = referenceKeys.filter(k => !targetKeys.includes(k));
    const extraInTarget = targetKeys.filter(k => !referenceKeys.includes(k));
    
    totalMissing += missingInTarget.length;
    totalExtra += extraInTarget.length;

    console.log(`  ${locale.toUpperCase()}: ${targetKeys.length} keys, ${missingInTarget.length} missing, ${extraInTarget.length} extra`);
    
    if (missingInTarget.length > 0) {
      console.error(`\n[FAIL] Missing keys in ${locale}:`);
      missingInTarget.slice(0, 5).forEach(key => console.error(`    - ${key}`));
      if (missingInTarget.length > 5) {
        console.error(`    ... and ${missingInTarget.length - 5} more`);
      }
    }
  }

  if (totalMissing > 0) {
    throw new Error(`Translation parity check failed: ${totalMissing} missing keys. Build aborted.`);
  }

  console.log("[Build] Translation parity check PASSED");
}

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // Run translation parity check FIRST - fail fast if translations are broken
  await runTranslationParityCheck();

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  if (FRONTEND_ONLY) {
    console.log("FRONTEND_ONLY mode: building static server...");
    await esbuild({
      entryPoints: ["server/static-server.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: ["express"],
      logLevel: "info",
    });
    console.log("Static-only build complete!");
    return;
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
