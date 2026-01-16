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
    warnings: []
  };

  // ========================================
  // REQUIRED VARIABLES
  // ========================================

  // Database Configuration (Required)
  if (!process.env.DATABASE_URL) {
    result.errors.push('DATABASE_URL is required. Format: postgresql://user:password@host:port/database');
    result.isValid = false;
  }

  // AI Service Keys (At least one required)
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOpenAI && !hasAnthropic) {
    result.errors.push('At least one AI API key is required: OPENAI_API_KEY or ANTHROPIC_API_KEY');
    result.isValid = false;
  }

  // ========================================
  // OPTIONAL VARIABLES WITH DEFAULTS
  // ========================================

  // Server Configuration
  const port = process.env.PORT || '5000';
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!process.env.PORT) {
    result.warnings.push(`PORT not set, using default: ${port}`);
  }

  if (!process.env.NODE_ENV) {
    result.warnings.push(`NODE_ENV not set, using default: ${nodeEnv}`);
  }

  // Validate PORT is a valid number
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    result.errors.push(`PORT must be a valid number between 1 and 65535, got: ${port}`);
    result.isValid = false;
  }

  // Validate NODE_ENV is a recognized value
  const validNodeEnvs = ['development', 'production', 'test'];
  if (!validNodeEnvs.includes(nodeEnv)) {
    result.warnings.push(`NODE_ENV should be one of: ${validNodeEnvs.join(', ')}. Got: ${nodeEnv}`);
  }

  // ========================================
  // RECOMMENDED OPTIONAL VARIABLES
  // ========================================

  // Admin Credentials
  if (!process.env.ADMIN_USERNAME) {
    result.warnings.push('ADMIN_USERNAME not set - admin features may not work properly');
  }

  if (!process.env.ADMIN_PASSWORD_HASH) {
    result.warnings.push('ADMIN_PASSWORD_HASH not set - admin authentication disabled');
  }

  // Email Service (Resend)
  if (!process.env.RESEND_API_KEY) {
    result.warnings.push('RESEND_API_KEY not set - email notifications disabled');
  }

  if (!process.env.LEAD_NOTIFICATION_EMAIL) {
    result.warnings.push('LEAD_NOTIFICATION_EMAIL not set - lead notifications will not be sent');
  }

  // Redis Cache (Falls back to in-memory)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    result.warnings.push('Redis configuration incomplete - using in-memory cache (not recommended for production)');
  }

  // Object Storage (S3)
  const hasS3Config = process.env.S3_BUCKET_NAME &&
                      process.env.S3_ACCESS_KEY_ID &&
                      process.env.S3_SECRET_ACCESS_KEY;

  if (!hasS3Config) {
    result.warnings.push('S3 storage configuration incomplete - file uploads may not work');
  }

  // Application URL
  if (!process.env.APP_URL) {
    result.warnings.push('APP_URL not set - sitemaps and canonical URLs may not work correctly');
  }

  // Image Generation Services
  if (!process.env.REPLICATE_API_KEY) {
    result.warnings.push('REPLICATE_API_KEY not set - AI image generation disabled');
  }

  if (!process.env.FREEPIK_API_KEY) {
    result.warnings.push('FREEPIK_API_KEY not set - stock image search disabled');
  }

  // Translation Services
  if (!process.env.DEEPL_API_KEY) {
    result.warnings.push('DEEPL_API_KEY not set - translation features disabled');
  }

  // Analytics
  if (!process.env.POSTHOG_API_KEY) {
    result.warnings.push('POSTHOG_API_KEY not set - analytics disabled');
  }

  // Google Maps
  if (!process.env.VITE_GOOGLE_MAPS_API_KEY) {
    result.warnings.push('VITE_GOOGLE_MAPS_API_KEY not set - map embed features disabled');
  }

  // ========================================
  // OUTPUT RESULTS
  // ========================================

  // Log AI service configuration
  const aiServices = [];
  if (hasOpenAI) aiServices.push('OpenAI');
  if (hasAnthropic) aiServices.push('Anthropic');

  console.log('\n========================================');
  console.log('Environment Configuration Validation');
  console.log('========================================');
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Port: ${port}`);
  console.log(`AI Services: ${aiServices.join(', ')}`);
  console.log('----------------------------------------');

  // Log warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  // Log errors and throw if invalid
  if (!result.isValid) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log('\n========================================\n');

    throw new Error(
      'Environment validation failed. Please check the errors above and ensure all required environment variables are set. ' +
      'See .env.example for reference.'
    );
  }

  if (result.warnings.length === 0) {
    console.log('\n✅ All environment variables validated successfully');
  } else {
    console.log('\n✅ Required environment variables validated (with warnings)');
  }

  console.log('========================================\n');
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
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
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
  return value.toLowerCase() === 'true' || value === '1';
}
