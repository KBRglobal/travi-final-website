/**
 * Octypo Configuration Module
 *
 * Centralized configuration for the Octypo autonomous content system.
 * Includes encrypted secrets management and optimization settings.
 */

// Import for local use
import { secretsExist as _secretsExist, loadSecretsToEnv as _loadSecretsToEnv } from "./secrets";

// Type export (interface)
export type { OctypoSecrets } from "./secrets";

// Value exports (functions)
export {
  encryptSecrets,
  decryptSecrets,
  saveSecrets,
  loadSecrets,
  secretsExist,
  getSecretsPassword,
  loadSecretsToEnv,
} from "./secrets";

/**
 * Initialize Octypo configuration
 * Call this at server startup to load encrypted secrets
 */
export function initializeOctypoConfig(): boolean {
  if (!_secretsExist()) {
    console.log(
      "[Octypo Config] No secrets file found. Run: npx tsx server/octypo/config/secrets.ts --setup"
    );
    return false;
  }

  try {
    const loaded = _loadSecretsToEnv();
    if (loaded) {
      console.log("[Octypo Config] Secrets loaded successfully");
      return true;
    } else {
      console.log("[Octypo Config] Failed to load secrets");
      return false;
    }
  } catch (error) {
    console.error("[Octypo Config] Error loading secrets:", error);
    return false;
  }
}
