/**
 * Funnel Detector
 *
 * Auto-detects funnels from traffic patterns and intent graph data.
 */

import type {
  Funnel,
  FunnelStep,
  FunnelCandidate,
  FunnelBottleneck,
  DetectedPath,
  FunnelStage,
  FunnelType,
} from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface DetectorConfig {
  minPathOccurrences: number;
  minConversionRate: number;
  maxFunnelSteps: number;
  minFunnelSteps: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: DetectorConfig = {
  minPathOccurrences: 10,
  minConversionRate: 0.01,
  maxFunnelSteps: 8,
  minFunnelSteps: 2,
  timeoutMs: 5000,
};

// ============================================================================
// STAGE INFERENCE
// ============================================================================

const STAGE_KEYWORDS: Record<FunnelStage, string[]> = {
  awareness: ["home", "blog", "article", "news", "discover", "learn"],
  interest: ["category", "list", "browse", "explore", "search"],
  consideration: ["product", "compare", "review", "details", "features"],
  decision: ["pricing", "plans", "quote", "demo", "trial"],
  action: ["cart", "checkout", "signup", "register", "subscribe", "buy"],
  retention: ["dashboard", "account", "settings", "profile", "orders"],
};

function inferStage(nodeId: string, position: number, totalSteps: number): FunnelStage {
  const lowerNode = nodeId.toLowerCase();

  // Check keywords
  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    if (keywords.some(kw => lowerNode.includes(kw))) {
      return stage as FunnelStage;
    }
  }

  // Fallback to position-based inference
  const positionRatio = position / totalSteps;
  if (positionRatio < 0.2) return "awareness";
  if (positionRatio < 0.4) return "interest";
  if (positionRatio < 0.6) return "consideration";
  if (positionRatio < 0.8) return "decision";
  return "action";
}

function inferFunnelType(steps: FunnelStep[]): FunnelType {
  const stages = steps.map(s => s.stage);

  if (stages.includes("action") && stages.includes("awareness")) {
    return "acquisition";
  }
  if (stages.includes("decision") || stages.includes("action")) {
    return "conversion";
  }
  if (stages.includes("retention")) {
    return "retention";
  }
  return "engagement";
}

// ============================================================================
// FUNNEL DETECTOR CLASS
// ============================================================================

export class FunnelDetector {
  private config: DetectorConfig;
  private detectedFunnels: Map<string, Funnel>;
  private candidates: Map<string, FunnelCandidate>;

  constructor(config?: Partial<DetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectedFunnels = new Map();
    this.candidates = new Map();
  }

  /**
   * Detect funnels from path data
   */
  detectFromPaths(paths: DetectedPath[]): Funnel[] {
    const startTime = Date.now();
    const newFunnels: Funnel[] = [];

    // Filter paths that meet minimum criteria
    const validPaths = paths.filter(
      p =>
        p.occurrences >= this.config.minPathOccurrences &&
        p.conversionRate >= this.config.minConversionRate &&
        p.nodes.length >= this.config.minFunnelSteps &&
        p.nodes.length <= this.config.maxFunnelSteps
    );

    // Group similar paths
    const pathGroups = this.groupSimilarPaths(validPaths);

    for (const group of pathGroups) {
      if (Date.now() - startTime > this.config.timeoutMs) {
        break;
      }

      const candidate = this.createCandidate(group);
      if (candidate.score >= 0.01) {
        // Lower threshold to allow more funnels
        this.candidates.set(candidate.id, candidate);

        const funnel = this.candidateToFunnel(candidate);
        this.detectedFunnels.set(funnel.id, funnel);
        newFunnels.push(funnel);
      }
    }

    return newFunnels;
  }

  /**
   * Group similar paths together
   */
  private groupSimilarPaths(paths: DetectedPath[]): DetectedPath[][] {
    const groups: DetectedPath[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < paths.length; i++) {
      if (used.has(i)) continue;

      const group = [paths[i]];
      used.add(i);

      for (let j = i + 1; j < paths.length; j++) {
        if (used.has(j)) continue;

        if (this.pathSimilarity(paths[i], paths[j]) > 0.7) {
          group.push(paths[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Calculate similarity between two paths
   */
  private pathSimilarity(path1: DetectedPath, path2: DetectedPath): number {
    const set1 = new Set(path1.nodes);
    const set2 = new Set(path2.nodes);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Create a funnel candidate from a group of paths
   */
  private createCandidate(pathGroup: DetectedPath[]): FunnelCandidate {
    // Merge paths to find common structure
    const nodeFrequency = new Map<string, number>();
    let totalOccurrences = 0;
    let totalConversion = 0;
    let totalValue = 0;

    for (const path of pathGroup) {
      totalOccurrences += path.occurrences;
      totalConversion += path.conversionRate * path.occurrences;
      totalValue += path.avgValue * path.occurrences;

      for (const node of path.nodes) {
        nodeFrequency.set(node, (nodeFrequency.get(node) || 0) + path.occurrences);
      }
    }

    // Sort nodes by frequency
    const sortedNodes = Array.from(nodeFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([node]) => node);

    // Identify entry, exit, and intermediate nodes
    const entryNode = pathGroup[0]?.nodes[0] || sortedNodes[0];
    const exitNode =
      pathGroup[0]?.nodes[pathGroup[0].nodes.length - 1] || sortedNodes[sortedNodes.length - 1];
    const intermediateNodes = sortedNodes.filter(n => n !== entryNode && n !== exitNode);

    // Calculate confidence based on consistency
    const avgOccurrences = totalOccurrences / pathGroup.length;
    const confidence = Math.min(1, avgOccurrences / 100);

    // Score based on conversion and value
    const avgConversion = totalConversion / totalOccurrences;
    const avgValue = totalValue / totalOccurrences;
    const score = (avgConversion * 50 + Math.min(avgValue / 100, 50)) / 100;

    return {
      id: `candidate-${Date.now().toString(36)}`,
      paths: pathGroup,
      entryNode,
      exitNode,
      intermediateNodes: intermediateNodes.slice(0, this.config.maxFunnelSteps - 2),
      score,
      confidence,
    };
  }

  /**
   * Convert candidate to full funnel
   */
  private candidateToFunnel(candidate: FunnelCandidate): Funnel {
    const allNodes = [candidate.entryNode, ...candidate.intermediateNodes, candidate.exitNode];
    const steps: FunnelStep[] = [];

    // Aggregate metrics from paths
    let totalEntries = 0;
    let totalConversions = 0;
    let totalValue = 0;
    let totalDuration = 0;

    for (const path of candidate.paths) {
      totalEntries += path.occurrences;
      totalConversions += path.occurrences * path.conversionRate;
      totalValue += path.occurrences * path.avgValue;
      totalDuration += path.occurrences * path.avgDuration;
    }

    // Create steps
    for (let i = 0; i < allNodes.length; i++) {
      const nodeId = allNodes[i];
      const stage = inferStage(nodeId, i, allNodes.length);

      // Estimate step metrics (simplified)
      const stepEntryRate = 1 - i * 0.1; // Approximate drop-off
      const stepEntries = Math.round(totalEntries * stepEntryRate);
      const stepExits = Math.round(stepEntries * 0.15);

      steps.push({
        id: `step-${i}-${nodeId.slice(0, 20)}`,
        name: this.formatNodeName(nodeId),
        stage,
        contentIds: [nodeId],
        entryCount: stepEntries,
        exitCount: stepExits,
        dropOffRate: stepExits / Math.max(stepEntries, 1),
        avgTimeInStep: totalDuration / totalEntries / allNodes.length,
        conversionRate: i === allNodes.length - 1 ? totalConversions / totalEntries : 0.85,
        value: i === allNodes.length - 1 ? totalValue / totalConversions : 0,
      });
    }

    // Calculate bottlenecks
    const bottlenecks = this.detectBottlenecks(steps);

    // Calculate health score
    const avgDropOff = steps.reduce((sum, s) => sum + s.dropOffRate, 0) / steps.length;
    const healthScore = Math.round((1 - avgDropOff) * 100);

    // Calculate overall score
    const conversionRate = totalConversions / totalEntries;
    const valuePerEntry = totalValue / totalEntries;
    const score = conversionRate * 40 + Math.min(valuePerEntry / 10, 30) + healthScore * 0.3;

    return {
      id: `funnel-${Date.now().toString(36)}`,
      name: `${this.formatNodeName(candidate.entryNode)} → ${this.formatNodeName(candidate.exitNode)}`,
      type: inferFunnelType(steps),
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAutoDetected: true,
      totalEntries,
      totalConversions: Math.round(totalConversions),
      overallConversionRate: conversionRate,
      avgCompletionTime: totalDuration / Math.max(totalConversions, 1),
      totalValue,
      score: Math.round(score * 100) / 100,
      healthScore,
      bottlenecks,
    };
  }

  /**
   * Detect bottlenecks in funnel steps
   */
  private detectBottlenecks(steps: FunnelStep[]): FunnelBottleneck[] {
    const bottlenecks: FunnelBottleneck[] = [];
    const avgDropOff = steps.reduce((sum, s) => sum + s.dropOffRate, 0) / steps.length;

    for (const step of steps) {
      if (step.dropOffRate > avgDropOff * 1.5 || step.dropOffRate > 0.3) {
        let severity: FunnelBottleneck["severity"];
        if (step.dropOffRate > 0.5) severity = "critical";
        else if (step.dropOffRate > 0.35) severity = "high";
        else if (step.dropOffRate > 0.25) severity = "medium";
        else severity = "low";

        const potentialLift = (step.dropOffRate - avgDropOff) * step.entryCount;

        bottlenecks.push({
          stepId: step.id,
          stepName: step.name,
          dropOffRate: step.dropOffRate,
          severity,
          potentialLift,
          suggestedActions: this.suggestActions(step, severity),
        });
      }
    }

    return bottlenecks.sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  /**
   * Suggest actions for bottleneck
   */
  private suggestActions(step: FunnelStep, severity: FunnelBottleneck["severity"]): string[] {
    const actions: string[] = [];

    if (step.avgTimeInStep < 10) {
      actions.push("Increase content engagement - users are leaving too quickly");
    }

    if (step.stage === "decision" || step.stage === "action") {
      actions.push("Simplify the conversion process");
      actions.push("Add trust signals (testimonials, security badges)");
    }

    if (severity === "critical" || severity === "high") {
      actions.push("Conduct user testing to identify friction points");
      actions.push("Consider A/B testing alternative layouts");
    }

    if (step.contentIds.length > 3) {
      actions.push("Consolidate content to reduce decision fatigue");
    }

    return actions.slice(0, 4);
  }

  /**
   * Format node ID to readable name
   */
  private formatNodeName(nodeId: string): string {
    // Remove common prefixes
    let name = nodeId
      .replace(/^(content:|intent:|action:|outcome:)/i, "")
      .replace(/-/g, " ")
      .replace(/_/g, " ");

    // Title case
    name = name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return name.slice(0, 30);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get all detected funnels
   */
  getAllFunnels(): Funnel[] {
    return Array.from(this.detectedFunnels.values());
  }

  /**
   * Get funnel by ID
   */
  getFunnel(id: string): Funnel | undefined {
    return this.detectedFunnels.get(id);
  }

  /**
   * Get top performing funnels
   */
  getTopFunnels(limit: number = 10): Funnel[] {
    return this.getAllFunnels()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get underperforming funnels
   */
  getUnderperformingFunnels(limit: number = 10): Funnel[] {
    return this.getAllFunnels()
      .filter(f => f.healthScore < 50 || f.bottlenecks.length > 0)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, limit);
  }

  /**
   * Get candidates
   */
  getCandidates(): FunnelCandidate[] {
    return Array.from(this.candidates.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.detectedFunnels.clear();
    this.candidates.clear();
  }
}

// Singleton instance
let detectorInstance: FunnelDetector | null = null;

export function getFunnelDetector(): FunnelDetector {
  if (!detectorInstance) {
    detectorInstance = new FunnelDetector();
  }
  return detectorInstance;
}

export function resetFunnelDetector(): void {
  if (detectorInstance) {
    detectorInstance.clear();
  }
  detectorInstance = null;
}
