/**
 * Autonomous Growth Tasks - Prioritizer
 * Intelligently prioritizes and scores growth tasks
 */

import {
  GrowthTask,
  TaskPriority,
  ImpactEstimate,
  GrowthMetrics,
  DEFAULT_GROWTH_CONFIG,
} from './types';

// Scoring weights
const WEIGHTS = {
  trafficPotential: 30,
  revenuePotential: 35,
  effortInverse: 20,
  confidence: 15,
};

function scoreImpact(impact: ImpactEstimate): number {
  const potentialScores = { high: 100, medium: 60, low: 30 };
  const effortScores = { high: 30, medium: 60, low: 100 }; // Inverse - low effort = high score

  const trafficScore = potentialScores[impact.trafficPotential];
  const revenueScore = potentialScores[impact.revenuePotential];
  const effortScore = effortScores[impact.effortLevel];

  return (
    (trafficScore * WEIGHTS.trafficPotential +
      revenueScore * WEIGHTS.revenuePotential +
      effortScore * WEIGHTS.effortInverse +
      impact.confidenceScore * 100 * WEIGHTS.confidence) /
    100
  );
}

export function scoreTask(task: GrowthTask): number {
  const baseScore = scoreImpact(task.estimatedImpact);

  // Boost for critical/high priority
  const priorityMultiplier: Record<TaskPriority, number> = {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 0.8,
  };

  // Age boost - older pending tasks get slight priority
  const ageHours = (Date.now() - task.createdAt.getTime()) / (60 * 60 * 1000);
  const ageBoost = Math.min(1.1, 1 + ageHours / 1000);

  return baseScore * priorityMultiplier[task.priority] * ageBoost;
}

export function prioritizeTasks(tasks: GrowthTask[]): GrowthTask[] {
  return [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a));
}

export function getTopTasks(tasks: GrowthTask[], limit = 10): GrowthTask[] {
  return prioritizeTasks(tasks.filter(t => t.status === 'pending')).slice(0, limit);
}

export function categorizeTasks(tasks: GrowthTask[]): {
  critical: GrowthTask[];
  high: GrowthTask[];
  medium: GrowthTask[];
  low: GrowthTask[];
} {
  return {
    critical: tasks.filter(t => t.priority === 'critical'),
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low'),
  };
}

export function estimateGrowthPotential(tasks: GrowthTask[]): {
  estimatedTrafficGain: number;
  estimatedRevenueGain: number;
  totalEffort: string;
} {
  let trafficGain = 0;
  let revenueGain = 0;
  let effortScore = 0;

  const trafficGains = { high: 1000, medium: 300, low: 50 };
  const revenueGains = { high: 500, medium: 150, low: 25 };
  const effortPoints = { high: 3, medium: 2, low: 1 };

  for (const task of tasks.filter(t => t.status === 'pending')) {
    trafficGain += trafficGains[task.estimatedImpact.trafficPotential];
    revenueGain += revenueGains[task.estimatedImpact.revenuePotential];
    effortScore += effortPoints[task.estimatedImpact.effortLevel];
  }

  let totalEffort = 'low';
  if (effortScore > tasks.length * 2) totalEffort = 'high';
  else if (effortScore > tasks.length * 1.5) totalEffort = 'medium';

  return {
    estimatedTrafficGain: trafficGain,
    estimatedRevenueGain: revenueGain,
    totalEffort,
  };
}

export function suggestNextAction(tasks: GrowthTask[]): {
  task: GrowthTask | null;
  reason: string;
} {
  const pending = tasks.filter(t => t.status === 'pending');
  if (pending.length === 0) {
    return { task: null, reason: 'No pending tasks available' };
  }

  // Look for quick wins first (low effort, high impact)
  const quickWins = pending.filter(
    t =>
      t.estimatedImpact.effortLevel === 'low' &&
      (t.estimatedImpact.trafficPotential === 'high' ||
        t.estimatedImpact.revenuePotential === 'high')
  );

  if (quickWins.length > 0) {
    const top = prioritizeTasks(quickWins)[0];
    return {
      task: top,
      reason: 'Quick win: Low effort with high impact potential',
    };
  }

  // Otherwise return highest priority
  const top = prioritizeTasks(pending)[0];
  return {
    task: top,
    reason: `Highest priority ${top.priority} task`,
  };
}

export function getBalancedWorkload(tasks: GrowthTask[], maxTasks = 10): GrowthTask[] {
  const categories = categorizeTasks(tasks.filter(t => t.status === 'pending'));

  // Balance across priorities and effort levels
  const selected: GrowthTask[] = [];

  // Critical first
  selected.push(...categories.critical.slice(0, 2));

  // Then high priority
  selected.push(...categories.high.slice(0, 3));

  // Fill with medium
  const remaining = maxTasks - selected.length;
  selected.push(...categories.medium.slice(0, remaining));

  // Add low priority if space
  if (selected.length < maxTasks) {
    selected.push(...categories.low.slice(0, maxTasks - selected.length));
  }

  return prioritizeTasks(selected);
}

export function calculateGrowthMetrics(tasks: GrowthTask[]): GrowthMetrics {
  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = completed.filter(t => t.completedAt && t.completedAt >= today);

  const potential = estimateGrowthPotential(pending);

  return {
    totalTasks: tasks.length,
    pendingTasks: pending.length,
    completedTasks: completed.length,
    tasksCompletedToday: completedToday.length,
    estimatedTrafficGain: potential.estimatedTrafficGain,
    estimatedRevenueGain: potential.estimatedRevenueGain,
    topOpportunities: getTopTasks(tasks, 5),
  };
}
