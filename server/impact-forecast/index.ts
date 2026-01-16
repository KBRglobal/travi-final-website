/**
 * Revenue & Impact Forecasting Engine Module
 *
 * Predict impact of any proposal BEFORE execution.
 *
 * Feature flag: ENABLE_IMPACT_FORECAST=false
 */

export * from './types';
export * from './models';
export {
  ImpactForecaster,
  getImpactForecaster,
  resetImpactForecaster,
} from './forecaster';
export { createImpactForecastRouter } from './routes';

const ENABLE_IMPACT_FORECAST = process.env.ENABLE_IMPACT_FORECAST === 'true';

/**
 * Initialize the Impact Forecasting system
 */
export function initImpactForecast(): void {
  if (!ENABLE_IMPACT_FORECAST) {
    console.log('[ImpactForecast] Disabled (ENABLE_IMPACT_FORECAST=false)');
    return;
  }

  console.log('[ImpactForecast] Initializing...');

  // Pre-initialize singleton
  const { getImpactForecaster } = require('./forecaster');
  getImpactForecaster();

  console.log('[ImpactForecast] Initialized');
}
