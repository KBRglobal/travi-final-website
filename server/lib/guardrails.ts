/**
 * Platform Guardrails - Runtime Invariant Enforcement
 * 
 * These functions enforce platform invariants at runtime.
 * They throw errors when invariants are violated.
 * 
 * USAGE:
 * - Call these at the boundary of operations (API routes, job handlers)
 * - Violations throw immediately - do not catch and ignore
 * - Dev warnings log to console but don't break production
 */

import {
  MAX_ENTITIES_PER_SESSION,
  MAX_INTENTS_PER_SESSION,
  HIGH_PERFORMING_SCORE,
  IMAGE_TASK_MUST_USE_ENGINE,
} from '../../shared/invariants';
import { getPerformanceScore } from '../content/metrics/content-performance';

const isDev = process.env.NODE_ENV !== 'production';

export class InvariantViolationError extends Error {
  constructor(
    public readonly invariant: string,
    public readonly details: Record<string, unknown>
  ) {
    super(`Invariant violation: ${invariant}`);
    this.name = 'InvariantViolationError';
  }
}

function devWarn(message: string, data?: Record<string, unknown>): void {
  if (isDev) {
    console.warn(`[Guardrail Warning] ${message}`, data ?? '');
  }
}

/**
 * Assert that image tasks are submitted through the Image Engine API.
 * Direct image task submission to AI orchestrator is BLOCKED.
 * 
 * @throws {InvariantViolationError} if taskCategory is 'image'
 */
export function assertImageTaskUsesEngine(taskCategory: string): void {
  if (!IMAGE_TASK_MUST_USE_ENGINE) {
    devWarn('IMAGE_TASK_MUST_USE_ENGINE is disabled - this is unsafe');
    return;
  }

  if (taskCategory === 'image') {
    throw new InvariantViolationError('IMAGE_TASK_MUST_USE_ENGINE', {
      taskCategory,
      message: 'Image tasks must be submitted via Image Engine API (/api/v1/images/*)',
    });
  }
}

/**
 * Assert that content with high performance scores is not modified.
 * Protects high-performing content from accidental regeneration.
 * 
 * @throws {InvariantViolationError} if content score > HIGH_PERFORMING_SCORE
 */
export function assertContentNotProtected(entityId: string): void {
  const score = getPerformanceScore(entityId);

  if (score > HIGH_PERFORMING_SCORE) {
    throw new InvariantViolationError('HIGH_PERFORMING_CONTENT_PROTECTED', {
      entityId,
      score,
      threshold: HIGH_PERFORMING_SCORE,
      message: `Content with score ${score} exceeds protection threshold ${HIGH_PERFORMING_SCORE}`,
    });
  }
}

export interface SessionLimits {
  entities: number;
  intents: number;
}

/**
 * Assert that a session is within allowed limits.
 * Prevents resource exhaustion from runaway sessions.
 * 
 * @throws {InvariantViolationError} if session exceeds entity or intent caps
 */
export function assertSessionWithinLimits(session: SessionLimits): void {
  if (session.entities > MAX_ENTITIES_PER_SESSION) {
    throw new InvariantViolationError('MAX_ENTITIES_PER_SESSION_EXCEEDED', {
      current: session.entities,
      max: MAX_ENTITIES_PER_SESSION,
      message: `Session has ${session.entities} entities, max is ${MAX_ENTITIES_PER_SESSION}`,
    });
  }

  if (session.intents > MAX_INTENTS_PER_SESSION) {
    throw new InvariantViolationError('MAX_INTENTS_PER_SESSION_EXCEEDED', {
      current: session.intents,
      max: MAX_INTENTS_PER_SESSION,
      message: `Session has ${session.intents} intents, max is ${MAX_INTENTS_PER_SESSION}`,
    });
  }
}

/**
 * Assert that code path should never be reached.
 * Useful for exhaustive switch statements and type narrowing.
 * 
 * @throws {InvariantViolationError} always - this should never execute
 */
export function assertNeverReached(value: never): never {
  throw new InvariantViolationError('IMPOSSIBLE_STATE_REACHED', {
    value,
    message: 'Code reached a state that should be impossible',
  });
}

/**
 * Assert that a state transition is valid.
 * Prevents invalid workflow transitions.
 * 
 * @throws {InvariantViolationError} if transition is not in allowed list
 */
export function assertValidTransition<T extends string>(
  from: T,
  to: T,
  allowed: ReadonlyArray<readonly [T, T]>
): void {
  const isValid = allowed.some(
    ([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to
  );

  if (!isValid) {
    devWarn('Invalid state transition attempted', { from, to, allowed });

    throw new InvariantViolationError('INVALID_STATE_TRANSITION', {
      from,
      to,
      allowed,
      message: `Transition from "${from}" to "${to}" is not allowed`,
    });
  }
}

/**
 * Dev-time warning for approaching limits.
 * Only logs in development, never breaks production.
 */
export function warnIfApproachingLimit(
  current: number,
  max: number,
  label: string,
  threshold = 0.8
): void {
  if (current >= max * threshold) {
    devWarn(`${label} approaching limit: ${current}/${max} (${Math.round((current / max) * 100)}%)`);
  }
}
