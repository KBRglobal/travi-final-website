/**
 * Publishing Mode Detection
 * 
 * During Replit's publish process, the app runs to validate database migrations.
 * Background services (timers, schedulers, etc.) must be disabled during this phase
 * to avoid consuming database connections that the validator needs.
 * 
 * Set DISABLE_BACKGROUND_SERVICES=true to skip all background processing.
 */

export const isPublishingMode = (): boolean => {
  return process.env.DISABLE_BACKGROUND_SERVICES === 'true' || 
         process.env.PUBLISHING_MODE === 'true' ||
         process.env.REPLIT_DEPLOYMENT === '1';
};

export const isBackgroundServicesEnabled = (): boolean => {
  return !isPublishingMode();
};

/**
 * Safe setInterval that respects publishing mode.
 * In publishing mode, the interval is not started and returns a dummy timer ID.
 */
export const safeSetInterval = (callback: () => void, ms: number): NodeJS.Timeout | null => {
  if (isPublishingMode()) {
    return null;
  }
  return setInterval(callback, ms);
};

/**
 * Log whether background services are enabled or disabled
 */
if (isPublishingMode()) {
  console.log('[Publishing Mode] Background services DISABLED - migration validation only');
}
