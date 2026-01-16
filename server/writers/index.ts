/**
 * Writer Persona System - Module Exports
 *
 * Feature flag: ENABLE_WRITER_PERSONAS=true
 *
 * Admin API:
 *   GET  /api/admin/writers
 *   GET  /api/admin/writers/:name
 *   POST /api/admin/writers/preview
 *   POST /api/admin/writers/build-prompt
 *   POST /api/admin/writers/recommend
 *   POST /api/admin/writers/check-suitability
 *   POST /api/admin/writers/resolve
 */

export { isWriterPersonasEnabled } from './types';
export type {
  PersonaName,
  WritingTone,
  StructureStyle,
  CitationBehavior,
  WriterPersona,
  PromptContext,
  BuiltPrompt,
} from './types';

export { PERSONAS, getPersona, getAllPersonas, personaExists } from './personas';

export {
  resolvePersona,
  resolvePersonaByName,
  resolvePersonaFromContext,
  getPersonaRecommendations,
  isPersonaSuitable,
} from './resolver';

export { buildPrompt, buildPreviewPrompt, estimateTokens } from './prompt-builder';

export { writersRoutes } from './routes';
