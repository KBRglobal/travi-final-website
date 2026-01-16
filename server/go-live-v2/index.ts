/**
 * Go-Live Switch v2
 *
 * Single endpoint that answers: "Are we ready to go live?"
 *
 * Feature flag: ENABLE_GO_LIVE_V2=false
 */

export * from './types';
export * from './service';
export { default as goLiveRoutes } from './routes';
