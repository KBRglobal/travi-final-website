/**
 * Chat API Routes
 * 
 * POST /api/chat - Process a chat message with context
 * GET /api/chat/health - Health check for chat system
 * GET /api/chat/metrics - Chat metrics including fallback rate (admin only)
 * 
 * Uses AI Orchestrator for all AI operations.
 */

import { Router, Request, Response } from 'express';
import { handleChatRequest, validateChatRequest, getChatMetrics, resetChatMetrics } from '../chat/chat-handler';
import { log } from '../lib/logger';

const router = Router();

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ChatRoute] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ChatRoute] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ChatRoute] ${msg}`, undefined, data),
};

/**
 * POST /api/chat
 * 
 * Process a chat message with page context.
 * 
 * Request body:
 * {
 *   message: string,
 *   context: {
 *     page: 'homepage' | 'destination' | 'article',
 *     entityId?: string,
 *     entityName?: string
 *   }
 * }
 * 
 * Response:
 * {
 *   answer: string,
 *   intent: 'browse' | 'compare' | 'plan' | 'learn',
 *   suggestions: Array<{ type: 'destination' | 'article' | 'attraction', id: string, name: string, slug: string }>,
 *   nextAction: { type: 'navigate' | 'search' | 'compare', payload: any } | null,
 *   actions?: Array<{ type: string, payload: object }>
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validateChatRequest(req.body);
    
    if (!validation.valid || !validation.request) {
      logger.warn('Invalid chat request', { error: validation.error });
      return res.status(400).json({
        error: validation.error || 'Invalid request',
      });
    }
    
    const response = await handleChatRequest(validation.request);
    
    const publicResponse: {
      answer: string;
      intent: string;
      suggestions: typeof response.suggestions;
      nextAction: typeof response.nextAction;
      actions?: typeof response.actions;
    } = {
      answer: response.answer,
      intent: response.intent || 'browse',
      suggestions: response.suggestions || [],
      nextAction: response.nextAction ?? null,
    };
    
    if (response.actions && response.actions.length > 0) {
      publicResponse.actions = response.actions;
    }
    
    logger.info('Chat response sent', {
      intent: publicResponse.intent,
      suggestionsCount: publicResponse.suggestions?.length || 0,
      hasNextAction: publicResponse.nextAction !== null,
    });
    
    return res.json(publicResponse);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Chat endpoint error', { error: errorMessage });
    
    return res.status(500).json({
      error: 'An error occurred processing your request',
    });
  }
});

/**
 * GET /api/chat/health
 * 
 * Health check for chat system
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'chat',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/chat/metrics
 * 
 * Get chat metrics including fallback rate.
 * 
 * Response:
 * {
 *   totalChatRequests: number,
 *   fallbacksUsed: number,
 *   fallbackRate: number, // percentage
 *   fallbackReasons: { [reason: string]: number },
 *   lastReset: string // ISO timestamp
 * }
 */
router.get('/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = getChatMetrics();
    
    logger.info('Chat metrics requested', {
      totalRequests: metrics.totalChatRequests,
      fallbackRate: metrics.fallbackRate,
    });
    
    return res.json(metrics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get chat metrics', { error: errorMessage });
    
    return res.status(500).json({
      error: 'Failed to retrieve chat metrics',
    });
  }
});

/**
 * POST /api/chat/metrics/reset
 * 
 * Reset chat metrics. Useful for testing or periodic resets.
 * Should be admin-only in production.
 */
router.post('/metrics/reset', (_req: Request, res: Response) => {
  try {
    resetChatMetrics();
    
    logger.info('Chat metrics reset');
    
    return res.json({
      success: true,
      message: 'Chat metrics have been reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to reset chat metrics', { error: errorMessage });
    
    return res.status(500).json({
      error: 'Failed to reset chat metrics',
    });
  }
});

export default router;
