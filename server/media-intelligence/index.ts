/**
 * Media Intelligence Module
 * Re-exports from v2 for backwards compatibility
 */

export * from "./index-v2";
export { mediaIntelligenceRoutesV2 as mediaIntelligenceRoutes } from "./routes-v2";

// Image Intelligence - AI-powered image processing
export * from "./image-intelligence";
export { registerMediaIntelligenceRoutes } from "./routes";
