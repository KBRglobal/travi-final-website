/**
 * Environment Variable Validator
 *
 * Validates required environment variables at application startup
 * and provides clear error messages for missing configuration.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/** Helper: warn if an env var is missing */
function warnIfMissing(result: ValidationResult, key: string, message: string): void {
  if (!process.env[key]) {
    result.warnings.push(message);
  }
}

/** Validate required variables and server config */
function validateCoreEnv(result: ValidationResult): void {
  if (!process.env.DATABASE_URL) {
    result.errors.push(
      "DATABASE_URL is required. Format: postgresql://user:password@host:port/database"
    );
    result.isValid = false;
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    result.warnings.push("No AI API key set - content generation disabled");
  }

  const port = process.env.PORT || "5000";
  const nodeEnv = process.env.NODE_ENV || "development";

  warnIfMissing(result, "PORT", `PORT not set, using default: ${port}`);
  warnIfMissing(result, "NODE_ENV", `NODE_ENV not set, using default: ${nodeEnv}`);

  const portNum = Number.parseInt(port, 10);
  if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    result.errors.push(`PORT must be a valid number between 1 and 65535, got: ${port}`);
    result.isValid = false;
  }

  const validNodeEnvs = ["development", "production", "test"];
  if (!validNodeEnvs.includes(nodeEnv)) {
    result.warnings.push(`NODE_ENV should be one of: ${validNodeEnvs.join(", ")}. Got: ${nodeEnv}`);
  }
}

/** Validate optional / recommended env vars */
function validateOptionalEnv(result: ValidationResult): void {
  warnIfMissing(
    result,
    "ADMIN_USERNAME",
    "ADMIN_USERNAME not set - admin features may not work properly"
  );
  warnIfMissing(
    result,
    "ADMIN_PASSWORD_HASH",
    "ADMIN_PASSWORD_HASH not set - admin authentication disabled"
  );
  warnIfMissing(result, "RESEND_API_KEY", "RESEND_API_KEY not set - email notifications disabled");
  warnIfMissing(
    result,
    "LEAD_NOTIFICATION_EMAIL",
    "LEAD_NOTIFICATION_EMAIL not set - lead notifications will not be sent"
  );

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    result.warnings.push(
      "Redis configuration incomplete - using in-memory cache (not recommended for production)"
    );
  }

  const hasS3Config =
    process.env.S3_BUCKET_NAME && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;
  if (!hasS3Config) {
    result.warnings.push("S3 storage configuration incomplete - file uploads may not work");
  }

  warnIfMissing(
    result,
    "APP_URL",
    "APP_URL not set - sitemaps and canonical URLs may not work correctly"
  );
  warnIfMissing(
    result,
    "REPLICATE_API_KEY",
    "REPLICATE_API_KEY not set - AI image generation disabled"
  );
  warnIfMissing(result, "FREEPIK_API_KEY", "FREEPIK_API_KEY not set - stock image search disabled");
  warnIfMissing(result, "DEEPL_API_KEY", "DEEPL_API_KEY not set - translation features disabled");
  warnIfMissing(result, "POSTHOG_API_KEY", "POSTHOG_API_KEY not set - analytics disabled");
  warnIfMissing(
    result,
    "VITE_GOOGLE_MAPS_API_KEY",
    "VITE_GOOGLE_MAPS_API_KEY not set - map embed features disabled"
  );
}

/**
 * Validates that all required environment variables are present
 * and properly configured. Throws an error if critical variables are missing.
 *
 * @throws {Error} If required environment variables are missing
 */
export function validateRequiredEnvVars(): void {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  validateCoreEnv(result);
  validateOptionalEnv(result);

  if (!result.isValid) {
    throw new Error(
      "Environment validation failed. Please check the errors above and ensure all required environment variables are set. " +
        "See .env.example for reference."
    );
  }
}

/**
 * Get environment variable with type checking and default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new TypeError(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value.toLowerCase() === "true" || value === "1";
}
