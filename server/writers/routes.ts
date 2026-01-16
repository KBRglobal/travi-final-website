/**
 * Writer Persona System - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { isWriterPersonasEnabled, PersonaName, PromptContext } from './types';
import { getAllPersonas, getPersona, personaExists } from './personas';
import { resolvePersona, getPersonaRecommendations, isPersonaSuitable } from './resolver';
import { buildPrompt, buildPreviewPrompt, estimateTokens } from './prompt-builder';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isWriterPersonasEnabled()) {
    res.status(503).json({
      error: 'Writer Personas is disabled',
      hint: 'Set ENABLE_WRITER_PERSONAS=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/writers
 * Get all available writer personas.
 */
router.get('/', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const personas = getAllPersonas();

    res.json({
      personas: personas.map(p => ({
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        tone: p.tone,
        structure: p.structure,
        depth: p.depth,
      })),
      count: personas.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/writers/:name
 * Get specific persona details.
 */
router.get('/:name', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    if (!personaExists(name)) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }

    const persona = getPersona(name as PersonaName);

    res.json({ persona });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/writers/preview
 * Preview a prompt with a specific persona.
 */
router.post('/preview', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { topic, persona: personaName } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const selectedPersona = personaName || 'default';

    if (!personaExists(selectedPersona)) {
      res.status(400).json({ error: 'Invalid persona name' });
      return;
    }

    const prompt = buildPreviewPrompt(topic, selectedPersona as PersonaName);
    const tokenEstimate = estimateTokens(prompt);

    res.json({
      prompt,
      tokenEstimate,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/writers/build-prompt
 * Build a full prompt with context.
 */
router.post('/build-prompt', requireEnabled, async (req: Request, res: Response) => {
  try {
    const {
      topic,
      persona: personaName,
      entityNames,
      keywords,
      targetWordCount,
      contentType,
      locale,
      additionalInstructions,
    } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const context: PromptContext = {
      topic,
      entityNames,
      keywords,
      targetWordCount,
      contentType,
      locale,
      additionalInstructions,
    };

    const prompt = buildPrompt(context, personaName);
    const tokenEstimate = estimateTokens(prompt);

    res.json({
      prompt,
      tokenEstimate,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/writers/recommend
 * Get persona recommendations for a topic.
 */
router.post('/recommend', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { topic, keywords, contentType, locale } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const context: PromptContext = {
      topic,
      keywords,
      contentType,
      locale,
    };

    const recommendations = getPersonaRecommendations(context);

    res.json({
      recommendations: recommendations.map(r => ({
        name: r.persona.name,
        displayName: r.persona.displayName,
        description: r.persona.description,
        reason: r.reason,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/writers/check-suitability
 * Check if a persona is suitable for content type.
 */
router.post('/check-suitability', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { persona, contentType } = req.body;

    if (!persona || !contentType) {
      res.status(400).json({ error: 'persona and contentType are required' });
      return;
    }

    if (!personaExists(persona)) {
      res.status(400).json({ error: 'Invalid persona name' });
      return;
    }

    const suitable = isPersonaSuitable(persona as PersonaName, contentType);

    res.json({
      persona,
      contentType,
      suitable,
      recommendation: suitable ? null : 'Consider using a different persona for this content type',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/writers/resolve
 * Resolve the best persona for given context.
 */
router.post('/resolve', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { topic, keywords, contentType, locale, preferredPersona } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const context: PromptContext = {
      topic,
      keywords,
      contentType,
      locale,
    };

    const persona = resolvePersona(preferredPersona, context);

    res.json({
      resolvedPersona: {
        name: persona.name,
        displayName: persona.displayName,
        description: persona.description,
      },
      wasPreferred: preferredPersona === persona.name,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as writersRoutes };
