/**
 * Re-export all storage functionality from modular storage modules.
 * This file exists for backward compatibility - all imports from './storage' will continue to work.
 *
 * The storage code has been split into smaller, domain-specific modules under ./storage/
 * For new code, consider importing directly from the specific modules.
 */
export * from "./storage/index";
