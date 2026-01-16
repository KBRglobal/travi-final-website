/**
 * Autonomous Growth Tasks - Task Generator
 * Converts detections into actionable growth tasks
 */

import {
  GrowthTask,
  GrowthTaskType,
  TaskPriority,
  Detection,
  ImpactEstimate,
  DEFAULT_GROWTH_CONFIG,
} from './types';

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calculatePriority(confidence: number, impact: ImpactEstimate): TaskPriority {
  const score = confidence * 100;

  if (impact.trafficPotential === 'high' && score >= DEFAULT_GROWTH_CONFIG.priorityThresholds.critical) {
    return 'critical';
  }
  if (score >= DEFAULT_GROWTH_CONFIG.priorityThresholds.high) {
    return 'high';
  }
  if (score >= DEFAULT_GROWTH_CONFIG.priorityThresholds.medium) {
    return 'medium';
  }
  return 'low';
}

function estimateImpact(detection: Detection): ImpactEstimate {
  const impactMap: Record<string, ImpactEstimate> = {
    missing_content: {
      trafficPotential: 'high',
      revenuePotential: 'high',
      effortLevel: 'high',
      confidenceScore: detection.confidence,
    },
    entity_without_aeo: {
      trafficPotential: 'medium',
      revenuePotential: 'medium',
      effortLevel: 'low',
      confidenceScore: detection.confidence,
    },
    high_value_no_links: {
      trafficPotential: 'medium',
      revenuePotential: 'low',
      effortLevel: 'low',
      confidenceScore: detection.confidence,
    },
    zero_result_queries: {
      trafficPotential: 'high',
      revenuePotential: 'medium',
      effortLevel: 'medium',
      confidenceScore: detection.confidence,
    },
    orphan_content: {
      trafficPotential: 'low',
      revenuePotential: 'low',
      effortLevel: 'low',
      confidenceScore: detection.confidence,
    },
    stale_content: {
      trafficPotential: 'medium',
      revenuePotential: 'medium',
      effortLevel: 'medium',
      confidenceScore: detection.confidence,
    },
    low_conversion: {
      trafficPotential: 'low',
      revenuePotential: 'high',
      effortLevel: 'medium',
      confidenceScore: detection.confidence,
    },
    content_gap: {
      trafficPotential: 'high',
      revenuePotential: 'high',
      effortLevel: 'high',
      confidenceScore: detection.confidence,
    },
  };

  return impactMap[detection.type] || {
    trafficPotential: 'low',
    revenuePotential: 'low',
    effortLevel: 'medium',
    confidenceScore: detection.confidence,
  };
}

function generateTitle(detection: Detection): string {
  const data = detection.data;

  switch (detection.suggestedTask) {
    case 'create_content':
      return `Create content for "${data.entityName || data.query || 'opportunity'}"`;

    case 'enrich_entity':
      return `Enrich entity "${data.entityName || data.entityId}"`;

    case 'add_internal_links':
      return `Add internal links to "${data.contentTitle || data.contentId}"`;

    case 'improve_aeo':
      return `Generate AEO capsule for "${data.contentTitle || data.contentId}"`;

    case 'update_stale_content':
      return `Update stale content "${data.contentTitle || data.contentId}"`;

    case 'optimize_conversion':
      return `Optimize conversion for "${data.contentTitle || data.contentId}"`;

    case 'fill_content_gap':
      return `Fill content gap: "${data.topic || data.keyword}"`;

    case 'rescue_orphan':
      return `Rescue orphan page "${data.contentTitle || data.contentId}"`;

    default:
      return `Growth task for ${detection.type}`;
  }
}

function generateDescription(detection: Detection): string {
  const data = detection.data;

  switch (detection.suggestedTask) {
    case 'improve_aeo':
      return `Content "${data.contentTitle}" lacks an AEO answer capsule. Generate one to improve visibility in AI search results.`;

    case 'add_internal_links':
      return `Content "${data.contentTitle}" has only ${data.currentLinks || 0} internal links. Add more to improve site navigation and SEO.`;

    case 'update_stale_content':
      return `Content "${data.contentTitle}" hasn't been updated in ${data.daysSinceUpdate || '180+'} days. Review and refresh for relevance.`;

    case 'rescue_orphan':
      return `Content "${data.contentTitle}" has ${data.inboundLinks || 0} inbound links, making it hard to discover. Add links from related content.`;

    case 'create_content':
      return `Entity or topic "${data.entityName || data.query}" has high traffic potential but no dedicated content.`;

    default:
      return `Detected opportunity: ${detection.type} with ${(detection.confidence * 100).toFixed(0)}% confidence.`;
  }
}

export function generateTask(detection: Detection): GrowthTask {
  const impact = estimateImpact(detection);
  const priority = calculatePriority(detection.confidence, impact);

  return {
    id: generateTaskId(),
    type: detection.suggestedTask,
    title: generateTitle(detection),
    description: generateDescription(detection),
    priority,
    status: 'pending',
    detectedBy: detection.type,
    targetEntity: (detection.data.entityId || detection.data.entityName) as string | undefined,
    targetContentId: detection.data.contentId as string | undefined,
    estimatedImpact: impact,
    metadata: detection.data,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    assignedTo: null,
    result: null,
  };
}

export function generateTasksFromDetections(detections: Detection[]): GrowthTask[] {
  // Deduplicate by target content/entity
  const seen = new Set<string>();
  const tasks: GrowthTask[] = [];

  for (const detection of detections) {
    const key = `${detection.suggestedTask}-${detection.data.contentId || detection.data.entityId || 'unknown'}`;

    if (seen.has(key)) continue;
    seen.add(key);

    tasks.push(generateTask(detection));
  }

  return tasks;
}

export function batchGenerateTasks(detections: Detection[], maxTasks = 50): GrowthTask[] {
  const tasks = generateTasksFromDetections(detections);

  // Sort by priority and limit
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return tasks
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, maxTasks);
}
