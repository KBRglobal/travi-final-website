/**
 * SEO/AEO Module - Entry Point
 * 
 * Central module for SEO and Answer Engine Optimization.
 * 
 * PHASE 6: Activated
 */

export {
  getPromptRegistry,
  PromptRegistry,
  type PromptType,
  type PromptTemplate,
  type PromptContext,
} from './prompt-registry';

export {
  getOutputNormalizer,
  OutputNormalizer,
  CONSTRAINTS,
  type NormalizationResult,
  type FAQItem,
} from './output-normalizer';

export {
  getRegenerationGuard,
  RegenerationGuard,
} from './regeneration-guard';
