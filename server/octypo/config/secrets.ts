/**
 * Octypo Secrets Manager
 * Encrypted storage for API keys and sensitive configuration
 *
 * Usage:
 * 1. Run: npx tsx server/octypo/config/secrets.ts --setup
 * 2. Enter your API keys when prompted
 * 3. Keys are encrypted with AES-256-GCM and stored in .octypo-secrets.enc
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

// Encryption settings
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const ITERATIONS = 100000;

// File paths
const SECRETS_FILE = ".octypo-secrets.enc";
const SECRETS_PATH = path.join(process.cwd(), SECRETS_FILE);

export interface OctypoSecrets {
  // Primary providers
  anthropic?: {
    apiKey?: string;
    apiKeys?: string[]; // Multiple keys for rotation
  };
  openai?: {
    apiKey?: string;
    apiKeys?: string[];
  };
  openrouter?: {
    apiKey?: string;
    apiKeys?: string[];
  };
  gemini?: {
    apiKey?: string;
    apiKeys?: string[];
  };
  groq?: {
    apiKey?: string;
  };
  mistral?: {
    apiKey?: string;
  };
  deepseek?: {
    apiKey?: string;
  };
  together?: {
    apiKey?: string;
  };
  perplexity?: {
    apiKey?: string;
  };

  // Monitoring & observability
  helicone?: {
    apiKey?: string;
    apiKeys?: string[];
  };

  // Optimization settings
  optimization?: {
    preferredProvider: string;
    fallbackOrder: string[];
    maxRetries: number;
    timeoutMs: number;
    rateLimitBuffer: number; // Percentage buffer before rate limit
  };

  // Metadata
  _meta?: {
    createdAt: string;
    updatedAt: string;
    version: number;
  };
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt secrets with AES-256-GCM
 */
export function encryptSecrets(secrets: OctypoSecrets, password: string): Buffer {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const jsonData = JSON.stringify(secrets, null, 2);
  const encrypted = Buffer.concat([cipher.update(jsonData, "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: salt (64) + iv (16) + authTag (16) + encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt secrets with AES-256-GCM
 */
export function decryptSecrets(encryptedData: Buffer, password: string): OctypoSecrets {
  const salt = encryptedData.subarray(0, SALT_LENGTH);
  const iv = encryptedData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedData.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = encryptedData.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString("utf8"));
}

/**
 * Save encrypted secrets to file
 */
export function saveSecrets(secrets: OctypoSecrets, password: string): void {
  // Update metadata
  secrets._meta = {
    createdAt: secrets._meta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: (secrets._meta?.version || 0) + 1,
  };

  const encrypted = encryptSecrets(secrets, password);
  fs.writeFileSync(SECRETS_PATH, encrypted);

  // Set restrictive permissions (owner read/write only)
  try {
    fs.chmodSync(SECRETS_PATH, 0o600);
  } catch (e) {
    // Windows doesn't support chmod - this is expected and safe to ignore
    console.error("[Secrets] chmod not supported on this platform:", e);
  }

  console.info(`✅ Secrets saved to ${SECRETS_FILE}`);
}

/**
 * Load and decrypt secrets from file
 */
export function loadSecrets(password: string): OctypoSecrets | null {
  if (!fs.existsSync(SECRETS_PATH)) {
    return null;
  }

  try {
    const encrypted = fs.readFileSync(SECRETS_PATH);
    return decryptSecrets(encrypted, password);
  } catch (error) {
    console.error("❌ Failed to decrypt secrets. Wrong password?");
    return null;
  }
}

/**
 * Check if secrets file exists
 */
export function secretsExist(): boolean {
  return fs.existsSync(SECRETS_PATH);
}

/**
 * Get password from environment or prompt
 */
export function getSecretsPassword(): string {
  // First check environment variable
  const envPassword = process.env.OCTYPO_SECRETS_PASSWORD;
  if (envPassword) {
    return envPassword;
  }

  // For production, require environment variable
  if (process.env.NODE_ENV === "production") {
    throw new Error("OCTYPO_SECRETS_PASSWORD environment variable required in production");
  }

  // Development fallback (not secure, but convenient)
  return "octypo-dev-key-change-in-prod";
}

/**
 * Load secrets into environment variables (for EngineRegistry compatibility)
 */
export function loadSecretsToEnv(password?: string): boolean {
  const pwd = password || getSecretsPassword();
  const secrets = loadSecrets(pwd);

  if (!secrets) {
    return false;
  }

  // Map secrets to environment variables
  if (secrets.anthropic?.apiKey) {
    process.env.ANTHROPIC_API_KEY = secrets.anthropic.apiKey;
  }
  if (secrets.anthropic?.apiKeys) {
    secrets.anthropic.apiKeys.forEach((key, i) => {
      process.env[`ANTHROPIC_API_KEY_${i + 1}`] = key;
    });
  }

  if (secrets.openai?.apiKey) {
    process.env.OPENAI_API_KEY = secrets.openai.apiKey;
  }
  if (secrets.openai?.apiKeys) {
    secrets.openai.apiKeys.forEach((key, i) => {
      process.env[`OPENAI_API_KEY_${i + 1}`] = key;
    });
  }

  if (secrets.openrouter?.apiKey) {
    process.env.OPENROUTER_API_KEY = secrets.openrouter.apiKey;
  }
  if (secrets.openrouter?.apiKeys) {
    secrets.openrouter.apiKeys.forEach((key, i) => {
      process.env[`OPENROUTER_API_KEY_${i + 1}`] = key;
    });
  }

  if (secrets.gemini?.apiKey) {
    process.env.GEMINI_API_KEY = secrets.gemini.apiKey;
  }
  if (secrets.gemini?.apiKeys) {
    secrets.gemini.apiKeys.forEach((key, i) => {
      process.env[`GEMINI_API_KEY_${i + 1}`] = key;
    });
  }

  if (secrets.groq?.apiKey) {
    process.env.GROQ_API_KEY = secrets.groq.apiKey;
  }

  if (secrets.mistral?.apiKey) {
    process.env.MISTRAL_API_KEY = secrets.mistral.apiKey;
  }

  if (secrets.deepseek?.apiKey) {
    process.env.DEEPSEEK_API_KEY = secrets.deepseek.apiKey;
  }

  if (secrets.together?.apiKey) {
    process.env.TOGETHER_API_KEY = secrets.together.apiKey;
  }

  if (secrets.perplexity?.apiKey) {
    process.env.PERPLEXITY_API_KEY = secrets.perplexity.apiKey;
  }

  if (secrets.helicone?.apiKey) {
    process.env.HELICONE_API_KEY = secrets.helicone.apiKey;
  }
  if (secrets.helicone?.apiKeys) {
    secrets.helicone.apiKeys.forEach((key, i) => {
      process.env[`HELICONE_API_KEY_${i + 1}`] = key;
    });
  }

  return true;
}

/**
 * Interactive CLI for setting up secrets
 */
async function interactiveSetup(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(prompt, resolve);
    });
  };

  const questionHidden = (prompt: string): Promise<string> => {
    return new Promise(resolve => {
      process.stdout.write(prompt);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      stdin.setRawMode?.(true);
      stdin.resume();

      let input = "";
      const onData = (char: Buffer) => {
        const c = char.toString();
        if (c === "\n" || c === "\r") {
          stdin.setRawMode?.(wasRaw);
          stdin.removeListener("data", onData);
          stdin.pause();
          process.stdout.write("\n");
          resolve(input);
        } else if (c === "\u0003") {
          // Ctrl+C
          process.exit();
        } else if (c === "\u007F") {
          // Backspace
          input = input.slice(0, -1);
          process.stdout.clearLine?.(0);
          process.stdout.cursorTo?.(0);
          process.stdout.write(prompt + "*".repeat(input.length));
        } else {
          input += c;
          process.stdout.write("*");
        }
      };

      stdin.on("data", onData);
    });
  };

  console.info("\n🔐 Octypo Secrets Setup\n");
  console.info("This will create an encrypted secrets file for your API keys.");
  console.info("The file will be encrypted with AES-256-GCM.\n");

  // Get or create password
  let password: string;
  if (secretsExist()) {
    password = await questionHidden("Enter existing password: ");
    const existing = loadSecrets(password);
    if (!existing) {
      console.info("❌ Wrong password. Exiting.");
      rl.close();
      return;
    }
    console.info("✅ Loaded existing secrets\n");
  } else {
    password = await questionHidden("Create a password: ");
    const confirm = await questionHidden("Confirm password: ");
    if (password !== confirm) {
      console.info("❌ Passwords do not match. Exiting.");
      rl.close();
      return;
    }
    console.info("");
  }

  // Load existing or create new
  const secrets: OctypoSecrets = loadSecrets(password) || {};

  console.info("Enter API keys (leave empty to skip):\n");

  // Anthropic
  const anthropicKey = await question(
    `Anthropic API Key [${secrets.anthropic?.apiKey ? "****" + secrets.anthropic.apiKey.slice(-4) : "not set"}]: `
  );
  if (anthropicKey) {
    secrets.anthropic = { ...secrets.anthropic, apiKey: anthropicKey };
  }

  // OpenAI
  const openaiKey = await question(
    `OpenAI API Key [${secrets.openai?.apiKey ? "****" + secrets.openai.apiKey.slice(-4) : "not set"}]: `
  );
  if (openaiKey) {
    secrets.openai = { ...secrets.openai, apiKey: openaiKey };
  }

  // OpenRouter
  const openrouterKey = await question(
    `OpenRouter API Key [${secrets.openrouter?.apiKey ? "****" + secrets.openrouter.apiKey.slice(-4) : "not set"}]: `
  );
  if (openrouterKey) {
    secrets.openrouter = { ...secrets.openrouter, apiKey: openrouterKey };
  }

  // Gemini
  const geminiKey = await question(
    `Gemini API Key [${secrets.gemini?.apiKey ? "****" + secrets.gemini.apiKey.slice(-4) : "not set"}]: `
  );
  if (geminiKey) {
    secrets.gemini = { ...secrets.gemini, apiKey: geminiKey };
  }

  // Groq
  const groqKey = await question(
    `Groq API Key [${secrets.groq?.apiKey ? "****" + secrets.groq.apiKey.slice(-4) : "not set"}]: `
  );
  if (groqKey) {
    secrets.groq = { apiKey: groqKey };
  }

  // Mistral
  const mistralKey = await question(
    `Mistral API Key [${secrets.mistral?.apiKey ? "****" + secrets.mistral.apiKey.slice(-4) : "not set"}]: `
  );
  if (mistralKey) {
    secrets.mistral = { apiKey: mistralKey };
  }

  // DeepSeek
  const deepseekKey = await question(
    `DeepSeek API Key [${secrets.deepseek?.apiKey ? "****" + secrets.deepseek.apiKey.slice(-4) : "not set"}]: `
  );
  if (deepseekKey) {
    secrets.deepseek = { apiKey: deepseekKey };
  }

  // Together
  const togetherKey = await question(
    `Together API Key [${secrets.together?.apiKey ? "****" + secrets.together.apiKey.slice(-4) : "not set"}]: `
  );
  if (togetherKey) {
    secrets.together = { apiKey: togetherKey };
  }

  // Perplexity
  const perplexityKey = await question(
    `Perplexity API Key [${secrets.perplexity?.apiKey ? "****" + secrets.perplexity.apiKey.slice(-4) : "not set"}]: `
  );
  if (perplexityKey) {
    secrets.perplexity = { apiKey: perplexityKey };
  }

  // Helicone (monitoring)
  const heliconeKey = await question(
    `Helicone API Key [${secrets.helicone?.apiKey ? "****" + secrets.helicone.apiKey.slice(-4) : "not set"}]: `
  );
  if (heliconeKey) {
    secrets.helicone = { ...secrets.helicone, apiKey: heliconeKey };
  }

  // Optimization settings
  console.info("\n⚙️  Optimization Settings:\n");

  const preferredProvider = await question(
    `Preferred Provider [${secrets.optimization?.preferredProvider || "anthropic"}]: `
  );

  secrets.optimization = {
    preferredProvider: preferredProvider || secrets.optimization?.preferredProvider || "anthropic",
    fallbackOrder: secrets.optimization?.fallbackOrder || [
      "openrouter",
      "gemini",
      "groq",
      "openai",
    ],
    maxRetries: secrets.optimization?.maxRetries || 3,
    timeoutMs: secrets.optimization?.timeoutMs || 30000,
    rateLimitBuffer: secrets.optimization?.rateLimitBuffer || 10,
  };

  // Save
  saveSecrets(secrets, password);

  console.info("\n📋 Summary:");
  console.info(`   Anthropic: ${secrets.anthropic?.apiKey ? "✅" : "❌"}`);
  console.info(`   OpenAI: ${secrets.openai?.apiKey ? "✅" : "❌"}`);
  console.info(`   OpenRouter: ${secrets.openrouter?.apiKey ? "✅" : "❌"}`);
  console.info(`   Gemini: ${secrets.gemini?.apiKey ? "✅" : "❌"}`);
  console.info(`   Groq: ${secrets.groq?.apiKey ? "✅" : "❌"}`);
  console.info(`   Mistral: ${secrets.mistral?.apiKey ? "✅" : "❌"}`);
  console.info(`   DeepSeek: ${secrets.deepseek?.apiKey ? "✅" : "❌"}`);
  console.info(`   Together: ${secrets.together?.apiKey ? "✅" : "❌"}`);
  console.info(`   Perplexity: ${secrets.perplexity?.apiKey ? "✅" : "❌"}`);
  console.info(`   Helicone: ${secrets.helicone?.apiKey ? "✅" : "❌"}`);

  console.info("\n🚀 To use in production:");
  console.info('   export OCTYPO_SECRETS_PASSWORD="your-password"');
  console.info("\n✅ Setup complete!\n");

  rl.close();
}

// CLI entry point - check if running directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("secrets.ts") ||
  process.argv[1]?.includes("setup-octypo-secrets");

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes("--setup") || args.includes("-s")) {
    interactiveSetup().catch(console.error);
  } else if (args.includes("--verify") || args.includes("-v")) {
    const password = process.env.OCTYPO_SECRETS_PASSWORD || getSecretsPassword();
    const secrets = loadSecrets(password);
    if (secrets) {
      console.info("✅ Secrets file valid");
      console.info(`   Version: ${secrets._meta?.version}`);
      console.info(`   Updated: ${secrets._meta?.updatedAt}`);
    } else {
      console.info("❌ Could not load secrets");
      process.exit(1);
    }
  } else if (args.includes("--export-env")) {
    // Export as environment variables (for debugging only)
    const password = process.env.OCTYPO_SECRETS_PASSWORD || getSecretsPassword();
    if (loadSecretsToEnv(password)) {
      console.info("✅ Secrets loaded to environment");
    } else {
      console.info("❌ Could not load secrets");
      process.exit(1);
    }
  } else {
    console.info("Octypo Secrets Manager\n");
    console.info("Usage:");
    console.info("  npx tsx server/octypo/config/secrets.ts --setup    Interactive setup");
    console.info("  npx tsx server/octypo/config/secrets.ts --verify   Verify secrets file");
    console.info("  npx tsx server/octypo/config/secrets.ts --export-env  Load to env vars");
    console.info("\nEnvironment:");
    console.info("  OCTYPO_SECRETS_PASSWORD  Password for encryption/decryption");
  }
}
