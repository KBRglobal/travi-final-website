/**
 * System Intelligence Feedback Loop - Learner
 * Statistical learning from task outcomes
 */

import {
  ConfidenceScore,
  WeightAdjustment,
  LearningModel,
  FeedbackSummary,
  DEFAULT_LEARNING_MODEL,
  DEFAULT_FEEDBACK_CONFIG,
} from './types';
import {
  getAllMeasuredEvents,
  getEventsByTaskType,
} from './tracker';

// Current learning model
let currentModel: LearningModel = { ...DEFAULT_LEARNING_MODEL };

// Weight adjustment history
const weightAdjustments: WeightAdjustment[] = [];
const MAX_ADJUSTMENTS = 100;

function generateAdjustmentId(): string {
  return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateTaskTypeConfidence(taskType: string): ConfidenceScore {
  const events = getEventsByTaskType(taskType);

  if (events.length === 0) {
    return {
      taskType,
      successRate: 0.5,
      averageImprovement: 0,
      sampleSize: 0,
      confidence: 0,
      lastUpdated: new Date(),
    };
  }

  const successEvents = events.filter(e => e.outcome === 'success');
  const successRate = successEvents.length / events.length;

  const improvements = events
    .filter(e => e.improvement !== 0)
    .map(e => e.improvement);

  const averageImprovement =
    improvements.length > 0
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length
      : 0;

  // Confidence based on sample size (0-1 scale)
  // Uses Wilson score interval approximation
  const n = events.length;
  const z = 1.96; // 95% confidence
  const phat = successRate;

  const denominator = 1 + (z * z) / n;
  const centerAdjusted = phat + (z * z) / (2 * n);
  const adjustedInterval = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);

  const lowerBound = (centerAdjusted - adjustedInterval) / denominator;
  const confidence = Math.max(0, Math.min(1, lowerBound));

  return {
    taskType,
    successRate,
    averageImprovement,
    sampleSize: events.length,
    confidence,
    lastUpdated: new Date(),
  };
}

export function calculateAllConfidenceScores(): ConfidenceScore[] {
  const taskTypes = Object.keys(currentModel.taskTypeWeights);
  return taskTypes.map(calculateTaskTypeConfidence);
}

export function shouldAdjustWeight(confidence: ConfidenceScore): boolean {
  return (
    confidence.sampleSize >= DEFAULT_FEEDBACK_CONFIG.minEventsForAdjustment &&
    confidence.confidence >= DEFAULT_FEEDBACK_CONFIG.confidenceThreshold
  );
}

export function calculateWeightAdjustment(
  currentWeight: number,
  confidence: ConfidenceScore
): number {
  const maxAdjustment = DEFAULT_FEEDBACK_CONFIG.maxWeightAdjustment;

  // Adjust based on success rate and improvement
  let adjustment = 0;

  if (confidence.successRate > 0.7 && confidence.averageImprovement > 5) {
    // Increase weight for successful task types
    adjustment = maxAdjustment * confidence.confidence;
  } else if (confidence.successRate < 0.3 || confidence.averageImprovement < -5) {
    // Decrease weight for failing task types
    adjustment = -maxAdjustment * confidence.confidence;
  }

  const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
  return newWeight;
}

export function updateTaskTypeWeights(): WeightAdjustment[] {
  const adjustments: WeightAdjustment[] = [];
  const confidenceScores = calculateAllConfidenceScores();

  for (const confidence of confidenceScores) {
    if (!shouldAdjustWeight(confidence)) continue;

    const currentWeight = currentModel.taskTypeWeights[confidence.taskType] || 1.0;
    const newWeight = calculateWeightAdjustment(currentWeight, confidence);

    if (Math.abs(newWeight - currentWeight) > 0.01) {
      const adjustment: WeightAdjustment = {
        id: generateAdjustmentId(),
        source: confidence.taskType,
        previousWeight: currentWeight,
        newWeight,
        reason: `Success rate: ${(confidence.successRate * 100).toFixed(1)}%, Improvement: ${confidence.averageImprovement.toFixed(1)}`,
        confidence: confidence.confidence,
        appliedAt: new Date(),
      };

      currentModel.taskTypeWeights[confidence.taskType] = newWeight;
      adjustments.push(adjustment);

      // Store adjustment history
      if (weightAdjustments.length >= MAX_ADJUSTMENTS) {
        weightAdjustments.shift();
      }
      weightAdjustments.push(adjustment);
    }
  }

  if (adjustments.length > 0) {
    currentModel.version++;
    currentModel.lastTrainedAt = new Date();
  }

  return adjustments;
}

export function updateSignalWeights(): WeightAdjustment[] {
  // Analyze which signal sources correlate with successful outcomes
  const events = getAllMeasuredEvents().filter(e => e.outcome !== 'pending');
  const adjustments: WeightAdjustment[] = [];

  if (events.length < DEFAULT_FEEDBACK_CONFIG.minEventsForAdjustment) {
    return adjustments;
  }

  const signalCorrelations: Record<string, { success: number; total: number }> = {
    content_health: { success: 0, total: 0 },
    revenue_intel: { success: 0, total: 0 },
    link_graph: { success: 0, total: 0 },
    search_intel: { success: 0, total: 0 },
  };

  for (const event of events) {
    const isSuccess = event.outcome === 'success';

    if (event.beforeMetrics.healthScore !== undefined) {
      signalCorrelations.content_health.total++;
      if (isSuccess) signalCorrelations.content_health.success++;
    }

    if (event.beforeMetrics.revenueScore !== undefined) {
      signalCorrelations.revenue_intel.total++;
      if (isSuccess) signalCorrelations.revenue_intel.success++;
    }

    if (event.beforeMetrics.linkScore !== undefined) {
      signalCorrelations.link_graph.total++;
      if (isSuccess) signalCorrelations.link_graph.success++;
    }

    if (event.beforeMetrics.priorityScore !== undefined) {
      signalCorrelations.search_intel.total++;
      if (isSuccess) signalCorrelations.search_intel.success++;
    }
  }

  const maxAdjustment = DEFAULT_FEEDBACK_CONFIG.maxWeightAdjustment;

  for (const [signal, data] of Object.entries(signalCorrelations)) {
    if (data.total < 5) continue;

    const successRate = data.success / data.total;
    const currentWeight = currentModel.signalWeights[signal] || 0.2;

    let adjustment = 0;
    if (successRate > 0.65) {
      adjustment = maxAdjustment * 0.5;
    } else if (successRate < 0.35) {
      adjustment = -maxAdjustment * 0.5;
    }

    if (Math.abs(adjustment) > 0.01) {
      const newWeight = Math.max(0.05, Math.min(0.5, currentWeight + adjustment));

      const weightAdj: WeightAdjustment = {
        id: generateAdjustmentId(),
        source: signal,
        previousWeight: currentWeight,
        newWeight,
        reason: `Signal correlation: ${(successRate * 100).toFixed(1)}% success rate`,
        confidence: data.total / events.length,
        appliedAt: new Date(),
      };

      currentModel.signalWeights[signal] = newWeight;
      adjustments.push(weightAdj);
      weightAdjustments.push(weightAdj);
    }
  }

  // Normalize signal weights to sum to 1
  const totalWeight = Object.values(currentModel.signalWeights).reduce((a, b) => a + b, 0);
  if (totalWeight > 0) {
    for (const key of Object.keys(currentModel.signalWeights)) {
      currentModel.signalWeights[key] = currentModel.signalWeights[key] / totalWeight;
    }
  }

  return adjustments;
}

export function trainModel(): {
  taskAdjustments: WeightAdjustment[];
  signalAdjustments: WeightAdjustment[];
  modelVersion: number;
} {
  const taskAdjustments = updateTaskTypeWeights();
  const signalAdjustments = updateSignalWeights();

  return {
    taskAdjustments,
    signalAdjustments,
    modelVersion: currentModel.version,
  };
}

export function getModel(): LearningModel {
  return { ...currentModel };
}

export function resetModel(): void {
  currentModel = { ...DEFAULT_LEARNING_MODEL, lastTrainedAt: new Date() };
  weightAdjustments.length = 0;
}

export function getWeightAdjustmentHistory(limit = 20): WeightAdjustment[] {
  return weightAdjustments.slice(-limit).reverse();
}

export function generateSummary(): FeedbackSummary {
  const events = getAllMeasuredEvents();
  const successfulTasks = events.filter(e => e.outcome === 'success').length;
  const failedTasks = events.filter(e => e.outcome === 'failure').length;

  const improvements = events
    .filter(e => e.improvement !== 0)
    .map(e => e.improvement);

  const averageImprovement =
    improvements.length > 0
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length
      : 0;

  return {
    totalEvents: events.length,
    successfulTasks,
    failedTasks,
    averageImprovement,
    confidenceScores: calculateAllConfidenceScores(),
    weightAdjustments: getWeightAdjustmentHistory(10),
    generatedAt: new Date(),
  };
}
