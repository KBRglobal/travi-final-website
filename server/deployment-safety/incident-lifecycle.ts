/**
 * Incident Lifecycle Manager - Extended Incident Management
 *
 * FEATURE: Complete incident lifecycle with:
 * - Phase transitions (detection → triage → investigation → mitigation → resolution → postmortem)
 * - Escalation policies
 * - Automated incident creation from monitors
 * - Postmortem workflow
 * - MTTF/MTTR tracking
 *
 * Feature flag: ENABLE_INCIDENT_LIFECYCLE=true
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger';
import type {
  IncidentPhase,
  IncidentTimeline,
  IncidentMetrics,
  EscalationPolicy,
  EscalationLevel,
  Postmortem,
  PostmortemActionItem,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[IncidentLifecycle] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[IncidentLifecycle] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[IncidentLifecycle] ${msg}`, undefined, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[IncidentLifecycle][ALERT] ${msg}`, data),
};

// Extended incident type
export interface ExtendedIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'deployment' | 'performance' | 'security' | 'data' | 'integration' | 'availability';
  phase: IncidentPhase;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  timeline: IncidentTimeline[];
  escalationLevel: EscalationLevel;
  lastEscalatedAt?: Date;
  assignee?: string;
  affectedSystems: string[];
  impactDescription?: string;
  mitigationSteps?: string[];
  rootCause?: string;
  postmortemId?: string;
  metrics?: IncidentMetrics;
  tags: string[];
  relatedIncidents: string[];
  externalLinks: { title: string; url: string }[];
}

// Bounded storage
const MAX_INCIDENTS = 500;
const MAX_POSTMORTEMS = 100;
const MAX_TIMELINE_ENTRIES = 100;

// Storage
const incidents: Map<string, ExtendedIncident> = new Map();
const postmortems: Map<string, Postmortem> = new Map();

// Escalation policies
const escalationPolicies: EscalationPolicy[] = [
  { level: 1, afterMinutes: 5, notifyChannels: ['email'], requiresAcknowledgement: true, autoEscalate: true },
  { level: 2, afterMinutes: 15, notifyChannels: ['email', 'slack'], requiresAcknowledgement: true, autoEscalate: true },
  { level: 3, afterMinutes: 30, notifyChannels: ['email', 'slack', 'pagerduty'], requiresAcknowledgement: true, autoEscalate: true },
  { level: 4, afterMinutes: 60, notifyChannels: ['email', 'slack', 'pagerduty', 'phone'], requiresAcknowledgement: true, autoEscalate: false },
];

// Event handlers
type IncidentEventHandler = (incident: ExtendedIncident, event: string) => void;
const eventHandlers: Set<IncidentEventHandler> = new Set();

// Notification handlers
type NotificationHandler = (channel: string, message: string, incident: ExtendedIncident) => void;
let notificationHandler: NotificationHandler | null = null;

// Escalation timer
let escalationInterval: ReturnType<typeof setInterval> | null = null;

// Metrics tracking
const metricsHistory: { timestamp: Date; mttd: number; mtta: number; mttm: number; mttr: number }[] = [];
const MAX_METRICS_HISTORY = 1000;

/**
 * Create a new incident
 */
export function createIncident(input: {
  title: string;
  description: string;
  severity: ExtendedIncident['severity'];
  type: ExtendedIncident['type'];
  affectedSystems?: string[];
  tags?: string[];
  automatic?: boolean;
}): ExtendedIncident {
  const id = randomUUID();

  const incident: ExtendedIncident = {
    id,
    title: input.title,
    description: input.description,
    severity: input.severity,
    type: input.type,
    phase: 'detection',
    status: 'open',
    createdAt: new Date(),
    escalationLevel: 1,
    timeline: [
      {
        timestamp: new Date(),
        phase: 'detection',
        actor: input.automatic ? 'system' : 'user',
        action: 'Incident created',
        automatic: input.automatic ?? false,
      },
    ],
    affectedSystems: input.affectedSystems || [],
    tags: input.tags || [],
    relatedIncidents: [],
    externalLinks: [],
  };

  // Bounded storage
  if (incidents.size >= MAX_INCIDENTS) {
    const oldest = Array.from(incidents.entries())
      .filter(([_, i]) => i.status === 'resolved')
      .sort((a, b) => (a[1].createdAt.getTime()) - (b[1].createdAt.getTime()))[0];
    if (oldest) {
      incidents.delete(oldest[0]);
    }
  }

  incidents.set(id, incident);

  logger.alert('Incident created', {
    id,
    title: input.title,
    severity: input.severity,
    type: input.type,
  });

  emitEvent(incident, 'created');
  sendNotifications(incident, 'created');

  // Auto-transition to triage
  transitionPhase(id, 'triage', 'system', true);

  return incident;
}

/**
 * Transition incident to new phase
 */
export function transitionPhase(
  incidentId: string,
  newPhase: IncidentPhase,
  actor: string,
  automatic: boolean = false
): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident) return null;

  const previousPhase = incident.phase;

  // Validate phase transition
  const validTransitions: Record<IncidentPhase, IncidentPhase[]> = {
    detection: ['triage'],
    triage: ['investigation'],
    investigation: ['mitigation'],
    mitigation: ['resolution'],
    resolution: ['postmortem'],
    postmortem: ['closed'],
    closed: [],
  };

  if (!validTransitions[previousPhase].includes(newPhase)) {
    logger.warn('Invalid phase transition', {
      incidentId,
      currentPhase: previousPhase,
      requestedPhase: newPhase,
    });
    return null;
  }

  incident.phase = newPhase;

  // Update status and timestamps based on phase
  switch (newPhase) {
    case 'triage':
      incident.status = 'acknowledged';
      incident.acknowledgedAt = new Date();
      break;
    case 'mitigation':
      incident.mitigatedAt = new Date();
      break;
    case 'resolution':
      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      break;
    case 'closed':
      incident.closedAt = new Date();
      break;
  }

  addTimelineEntry(incident, newPhase, actor, `Phase transitioned to ${newPhase}`, automatic);

  logger.info('Incident phase transitioned', {
    incidentId,
    previousPhase,
    newPhase,
    actor,
  });

  // Calculate metrics on resolution
  if (newPhase === 'resolution') {
    calculateMetrics(incident);
  }

  emitEvent(incident, `phase_${newPhase}`);
  sendNotifications(incident, `phase_${newPhase}`);

  return incident;
}

/**
 * Acknowledge incident
 */
export function acknowledgeIncident(incidentId: string, actor: string): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident || incident.status !== 'open') return null;

  incident.status = 'acknowledged';
  incident.acknowledgedAt = new Date();
  incident.assignee = actor;

  addTimelineEntry(incident, incident.phase, actor, 'Incident acknowledged');

  logger.info('Incident acknowledged', { incidentId, actor });

  emitEvent(incident, 'acknowledged');

  return incident;
}

/**
 * Add update to incident
 */
export function addIncidentUpdate(
  incidentId: string,
  actor: string,
  action: string,
  notes?: string
): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident) return null;

  addTimelineEntry(incident, incident.phase, actor, action, false, notes);

  logger.info('Incident updated', { incidentId, actor, action });

  emitEvent(incident, 'updated');

  return incident;
}

/**
 * Set mitigation steps
 */
export function setMitigationSteps(
  incidentId: string,
  steps: string[],
  actor: string
): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident) return null;

  incident.mitigationSteps = steps;
  addTimelineEntry(incident, incident.phase, actor, 'Mitigation steps updated');

  return incident;
}

/**
 * Set root cause
 */
export function setRootCause(
  incidentId: string,
  rootCause: string,
  actor: string
): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident) return null;

  incident.rootCause = rootCause;
  addTimelineEntry(incident, incident.phase, actor, 'Root cause identified');

  return incident;
}

/**
 * Escalate incident
 */
export function escalateIncident(
  incidentId: string,
  actor: string,
  automatic: boolean = false
): ExtendedIncident | null {
  const incident = incidents.get(incidentId);
  if (!incident || incident.escalationLevel >= 4) return null;

  const previousLevel = incident.escalationLevel;
  incident.escalationLevel = (incident.escalationLevel + 1) as EscalationLevel;
  incident.lastEscalatedAt = new Date();

  addTimelineEntry(
    incident,
    incident.phase,
    actor,
    `Escalated from level ${previousLevel} to level ${incident.escalationLevel}`,
    automatic
  );

  logger.warn('Incident escalated', {
    incidentId,
    previousLevel,
    newLevel: incident.escalationLevel,
    automatic,
  });

  emitEvent(incident, 'escalated');
  sendNotifications(incident, 'escalated');

  return incident;
}

/**
 * Create postmortem for incident
 */
export function createPostmortem(
  incidentId: string,
  author: string
): Postmortem | null {
  const incident = incidents.get(incidentId);
  if (!incident || incident.phase !== 'postmortem') return null;

  const postmortem: Postmortem = {
    incidentId,
    createdAt: new Date(),
    summary: '',
    rootCause: incident.rootCause || '',
    contributingFactors: [],
    timeline: [...incident.timeline],
    impactAssessment: incident.impactDescription || '',
    lessonsLearned: [],
    actionItems: [],
    authors: [author],
    reviewers: [],
    approved: false,
  };

  // Bounded storage
  if (postmortems.size >= MAX_POSTMORTEMS) {
    const oldest = Array.from(postmortems.entries())
      .filter(([_, p]) => p.approved)
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0];
    if (oldest) {
      postmortems.delete(oldest[0]);
    }
  }

  postmortems.set(incidentId, postmortem);
  incident.postmortemId = incidentId;

  logger.info('Postmortem created', { incidentId, author });

  return postmortem;
}

/**
 * Update postmortem
 */
export function updatePostmortem(
  incidentId: string,
  updates: Partial<Omit<Postmortem, 'incidentId' | 'createdAt'>>
): Postmortem | null {
  const postmortem = postmortems.get(incidentId);
  if (!postmortem) return null;

  Object.assign(postmortem, updates);

  if (updates.actionItems) {
    // Ensure action items have IDs
    for (const item of postmortem.actionItems) {
      if (!item.id) {
        item.id = randomUUID();
      }
    }
  }

  return postmortem;
}

/**
 * Add action item to postmortem
 */
export function addActionItem(
  incidentId: string,
  item: Omit<PostmortemActionItem, 'id' | 'status' | 'completedAt'>
): PostmortemActionItem | null {
  const postmortem = postmortems.get(incidentId);
  if (!postmortem) return null;

  const actionItem: PostmortemActionItem = {
    ...item,
    id: randomUUID(),
    status: 'open',
  };

  postmortem.actionItems.push(actionItem);

  logger.info('Action item added', { incidentId, itemId: actionItem.id });

  return actionItem;
}

/**
 * Complete action item
 */
export function completeActionItem(
  incidentId: string,
  itemId: string
): PostmortemActionItem | null {
  const postmortem = postmortems.get(incidentId);
  if (!postmortem) return null;

  const item = postmortem.actionItems.find(a => a.id === itemId);
  if (!item) return null;

  item.status = 'completed';
  item.completedAt = new Date();

  return item;
}

/**
 * Approve postmortem
 */
export function approvePostmortem(
  incidentId: string,
  reviewer: string
): Postmortem | null {
  const postmortem = postmortems.get(incidentId);
  if (!postmortem) return null;

  if (!postmortem.reviewers.includes(reviewer)) {
    postmortem.reviewers.push(reviewer);
  }

  // Require at least 2 reviewers for approval
  if (postmortem.reviewers.length >= 2) {
    postmortem.approved = true;
    postmortem.completedAt = new Date();

    // Transition incident to closed
    const incident = incidents.get(incidentId);
    if (incident) {
      transitionPhase(incidentId, 'closed', reviewer);
    }

    logger.info('Postmortem approved', { incidentId, reviewerCount: postmortem.reviewers.length });
  }

  return postmortem;
}

/**
 * Calculate incident metrics
 */
function calculateMetrics(incident: ExtendedIncident): void {
  const metrics: IncidentMetrics = {
    timeToDetectionMs: 0,
    timeToAcknowledgeMs: 0,
    timeToMitigateMs: 0,
    timeToResolveMs: 0,
    totalDurationMs: 0,
    escalationCount: incident.escalationLevel - 1,
    updateCount: incident.timeline.length,
  };

  const created = incident.createdAt.getTime();

  if (incident.acknowledgedAt) {
    metrics.timeToAcknowledgeMs = incident.acknowledgedAt.getTime() - created;
  }

  if (incident.mitigatedAt) {
    metrics.timeToMitigateMs = incident.mitigatedAt.getTime() - created;
  }

  if (incident.resolvedAt) {
    metrics.timeToResolveMs = incident.resolvedAt.getTime() - created;
    metrics.totalDurationMs = metrics.timeToResolveMs;
  }

  incident.metrics = metrics;

  // Add to metrics history
  metricsHistory.push({
    timestamp: new Date(),
    mttd: metrics.timeToDetectionMs,
    mtta: metrics.timeToAcknowledgeMs,
    mttm: metrics.timeToMitigateMs,
    mttr: metrics.timeToResolveMs,
  });

  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }
}

/**
 * Add timeline entry
 */
function addTimelineEntry(
  incident: ExtendedIncident,
  phase: IncidentPhase,
  actor: string,
  action: string,
  automatic: boolean = false,
  notes?: string
): void {
  const entry: IncidentTimeline = {
    timestamp: new Date(),
    phase,
    actor,
    action,
    automatic,
    notes,
  };

  incident.timeline.push(entry);

  // Bound timeline
  if (incident.timeline.length > MAX_TIMELINE_ENTRIES) {
    incident.timeline = incident.timeline.slice(-MAX_TIMELINE_ENTRIES);
  }
}

/**
 * Emit event to subscribers
 */
function emitEvent(incident: ExtendedIncident, event: string): void {
  for (const handler of eventHandlers) {
    try {
      handler(incident, event);
    } catch (err) {
      logger.warn('Incident event handler error', {
        event,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Send notifications
 */
function sendNotifications(incident: ExtendedIncident, event: string): void {
  if (!notificationHandler) return;

  const policy = escalationPolicies.find(p => p.level === incident.escalationLevel);
  if (!policy) return;

  const message = buildNotificationMessage(incident, event);

  for (const channel of policy.notifyChannels) {
    try {
      notificationHandler(channel, message, incident);
    } catch (err) {
      logger.warn('Notification send failed', {
        channel,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Build notification message
 */
function buildNotificationMessage(incident: ExtendedIncident, event: string): string {
  const severityEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const emoji = severityEmoji[incident.severity] || '⚪';

  return `${emoji} [${incident.severity.toUpperCase()}] ${incident.title}
Event: ${event}
Phase: ${incident.phase}
Escalation Level: ${incident.escalationLevel}
Affected Systems: ${incident.affectedSystems.join(', ') || 'Unknown'}

${incident.description}

Incident ID: ${incident.id}`;
}

/**
 * Start escalation monitoring
 */
export function startEscalationMonitoring(): void {
  if (escalationInterval) {
    logger.warn('Escalation monitoring already running');
    return;
  }

  escalationInterval = setInterval(() => {
    const now = Date.now();

    for (const incident of incidents.values()) {
      if (incident.status === 'resolved' || incident.escalationLevel >= 4) continue;

      const policy = escalationPolicies.find(p => p.level === incident.escalationLevel);
      if (!policy || !policy.autoEscalate) continue;

      // Check if acknowledgement timeout exceeded
      if (incident.status === 'open' && policy.requiresAcknowledgement) {
        const elapsed = now - incident.createdAt.getTime();
        if (elapsed >= policy.afterMinutes * 60 * 1000) {
          escalateIncident(incident.id, 'system', true);
        }
      }
    }
  }, 60000); // Check every minute

  logger.info('Escalation monitoring started');
}

/**
 * Stop escalation monitoring
 */
export function stopEscalationMonitoring(): void {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    logger.info('Escalation monitoring stopped');
  }
}

/**
 * Subscribe to incident events
 */
export function subscribeToIncidentEvents(handler: IncidentEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Set notification handler
 */
export function setNotificationHandler(handler: NotificationHandler): void {
  notificationHandler = handler;
  logger.info('Notification handler registered');
}

/**
 * Get incident by ID
 */
export function getIncident(incidentId: string): ExtendedIncident | null {
  return incidents.get(incidentId) || null;
}

/**
 * List incidents
 */
export function listIncidents(options?: {
  status?: 'open' | 'acknowledged' | 'resolved';
  severity?: ExtendedIncident['severity'];
  phase?: IncidentPhase;
  limit?: number;
}): ExtendedIncident[] {
  let results = Array.from(incidents.values());

  if (options?.status) {
    results = results.filter(i => i.status === options.status);
  }

  if (options?.severity) {
    results = results.filter(i => i.severity === options.severity);
  }

  if (options?.phase) {
    results = results.filter(i => i.phase === options.phase);
  }

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get postmortem by incident ID
 */
export function getPostmortem(incidentId: string): Postmortem | null {
  return postmortems.get(incidentId) || null;
}

/**
 * Get incident statistics
 */
export function getIncidentStats(): {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  avgMttaMs: number;
  avgMttrMs: number;
  escalationRate: number;
} {
  const stats = {
    total: 0,
    open: 0,
    acknowledged: 0,
    resolved: 0,
    bySeverity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    avgMttaMs: 0,
    avgMttrMs: 0,
    escalationRate: 0,
  };

  let totalMtta = 0;
  let totalMttr = 0;
  let mttaCount = 0;
  let mttrCount = 0;
  let escalatedCount = 0;

  for (const incident of incidents.values()) {
    stats.total++;

    switch (incident.status) {
      case 'open': stats.open++; break;
      case 'acknowledged': stats.acknowledged++; break;
      case 'resolved': stats.resolved++; break;
    }

    stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
    stats.byType[incident.type] = (stats.byType[incident.type] || 0) + 1;

    if (incident.metrics) {
      if (incident.metrics.timeToAcknowledgeMs > 0) {
        totalMtta += incident.metrics.timeToAcknowledgeMs;
        mttaCount++;
      }
      if (incident.metrics.timeToResolveMs > 0) {
        totalMttr += incident.metrics.timeToResolveMs;
        mttrCount++;
      }
    }

    if (incident.escalationLevel > 1) {
      escalatedCount++;
    }
  }

  stats.avgMttaMs = mttaCount > 0 ? Math.round(totalMtta / mttaCount) : 0;
  stats.avgMttrMs = mttrCount > 0 ? Math.round(totalMttr / mttrCount) : 0;
  stats.escalationRate = stats.total > 0 ? escalatedCount / stats.total : 0;

  return stats;
}

/**
 * Get metrics trends
 */
export function getMetricsTrends(limit?: number): typeof metricsHistory {
  return limit ? metricsHistory.slice(-limit) : [...metricsHistory];
}

/**
 * Clear all incidents (for testing)
 */
export function clearAllIncidents(): void {
  incidents.clear();
  postmortems.clear();
  metricsHistory.length = 0;
  logger.info('All incident data cleared');
}

/**
 * Create incident from monitor alert
 */
export function createIncidentFromMonitor(
  monitorName: string,
  alertMessage: string,
  severity: ExtendedIncident['severity'],
  affectedSystems: string[]
): ExtendedIncident {
  return createIncident({
    title: `[${monitorName}] ${alertMessage.slice(0, 100)}`,
    description: alertMessage,
    severity,
    type: 'availability',
    affectedSystems,
    tags: ['auto-created', 'monitor-alert', monitorName],
    automatic: true,
  });
}
