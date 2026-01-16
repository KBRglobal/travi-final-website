/**
 * Publish Gates - Structured Errors
 */

import type { GateReport, GateEvaluation } from './types';

export class PublishBlockedError extends Error {
  public readonly code = 'PUBLISH_BLOCKED';
  public readonly contentId: string;
  public readonly blockedBy: GateEvaluation[];
  public readonly report: GateReport;

  constructor(report: GateReport) {
    const blockedRules = report.evaluations.filter(e => e.result === 'BLOCK');
    const ruleNames = blockedRules.map(r => r.rule).join(', ');

    super(`Publish blocked by: ${ruleNames}`);
    this.name = 'PublishBlockedError';
    this.contentId = report.contentId;
    this.blockedBy = blockedRules;
    this.report = report;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      contentId: this.contentId,
      blockedBy: this.blockedBy.map(e => ({
        rule: e.rule,
        message: e.message,
        details: e.details,
      })),
    };
  }
}

export class GateEvaluationError extends Error {
  public readonly code = 'GATE_EVALUATION_FAILED';
  public readonly rule: string;

  constructor(rule: string, cause: Error) {
    super(`Gate evaluation failed for rule "${rule}": ${cause.message}`);
    this.name = 'GateEvaluationError';
    this.rule = rule;
    this.cause = cause;
  }
}
