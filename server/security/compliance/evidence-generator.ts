/**
 * Compliance Evidence Generator
 *
 * Generates verifiable evidence for compliance frameworks:
 * - SOC 2 Type II
 * - ISO 27001
 * - GDPR Article 30
 * - HIPAA (if applicable)
 * - PCI-DSS (if applicable)
 *
 * Evidence types:
 * - Access control logs
 * - Policy enforcement records
 * - Change management trails
 * - Incident response logs
 * - Risk assessment reports
 */

import * as crypto from "node:crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceEvidence {
  id: string;
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  evidenceType: EvidenceType;
  timestamp: Date;
  periodStart: Date;
  periodEnd: Date;
  description: string;
  data: Record<string, unknown>;
  attestations: Attestation[];
  hash: string;
  chainPreviousHash?: string;
}

export type ComplianceFramework =
  | "SOC2"
  | "ISO27001"
  | "GDPR"
  | "HIPAA"
  | "PCI_DSS"
  | "NIST"
  | "CUSTOM";

export type EvidenceType =
  | "access_log"
  | "policy_enforcement"
  | "change_management"
  | "incident_response"
  | "risk_assessment"
  | "configuration"
  | "training_record"
  | "vulnerability_scan"
  | "penetration_test"
  | "backup_verification";

export interface Attestation {
  attesterId: string;
  attesterRole: string;
  attestedAt: Date;
  statement: string;
  signature: string;
}

export interface ControlMapping {
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  description: string;
  evidenceRequirements: EvidenceRequirement[];
  automationLevel: "full" | "partial" | "manual";
}

export interface EvidenceRequirement {
  type: EvidenceType;
  frequency: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  minRecords: number;
  validationRules: string[];
}

export interface ComplianceReport {
  id: string;
  generatedAt: Date;
  framework: ComplianceFramework;
  periodStart: Date;
  periodEnd: Date;
  controls: ControlStatus[];
  overallStatus: "compliant" | "partial" | "non_compliant";
  gaps: ComplianceGap[];
  recommendations: string[];
  signature: string;
}

export interface ControlStatus {
  controlId: string;
  controlName: string;
  status: "met" | "partial" | "not_met" | "not_applicable";
  evidenceCount: number;
  lastEvidenceDate?: Date;
  issues: string[];
}

export interface ComplianceGap {
  controlId: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  remediation: string;
  dueDate?: Date;
}

// ============================================================================
// CONTROL MAPPINGS
// ============================================================================

const SOC2_CONTROLS: ControlMapping[] = [
  {
    framework: "SOC2",
    controlId: "CC6.1",
    controlName: "Logical and Physical Access Controls",
    description:
      "The entity implements logical access security software, infrastructure, and architectures",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 100,
        validationRules: ["has_user_id", "has_timestamp", "has_action", "has_result"],
      },
      {
        type: "policy_enforcement",
        frequency: "daily",
        minRecords: 10,
        validationRules: ["has_policy_id", "has_decision"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "SOC2",
    controlId: "CC6.2",
    controlName: "Prior to System Access",
    description: "Prior to issuing system credentials, the entity registers authorized users",
    evidenceRequirements: [
      {
        type: "change_management",
        frequency: "continuous",
        minRecords: 10,
        validationRules: ["has_approval", "has_requester", "has_approver"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "SOC2",
    controlId: "CC6.3",
    controlName: "Role-Based Access",
    description: "The entity authorizes, modifies, or removes access based on roles",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 50,
        validationRules: ["has_role", "has_permission"],
      },
      {
        type: "configuration",
        frequency: "weekly",
        minRecords: 1,
        validationRules: ["has_role_matrix"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "SOC2",
    controlId: "CC7.2",
    controlName: "Security Incident Monitoring",
    description: "The entity monitors system components for anomalies",
    evidenceRequirements: [
      {
        type: "incident_response",
        frequency: "continuous",
        minRecords: 0, // May have 0 incidents
        validationRules: ["has_detection_time", "has_response_time"],
      },
      {
        type: "configuration",
        frequency: "weekly",
        minRecords: 1,
        validationRules: ["has_monitoring_config"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "SOC2",
    controlId: "CC8.1",
    controlName: "Change Management",
    description: "The entity authorizes, designs, develops, tests changes",
    evidenceRequirements: [
      {
        type: "change_management",
        frequency: "continuous",
        minRecords: 10,
        validationRules: ["has_change_request", "has_approval", "has_testing"],
      },
    ],
    automationLevel: "partial",
  },
];

const ISO27001_CONTROLS: ControlMapping[] = [
  {
    framework: "ISO27001",
    controlId: "A.9.2.1",
    controlName: "User Registration and De-registration",
    description: "Formal user registration and de-registration process",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 20,
        validationRules: ["has_registration_event", "has_approval"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "ISO27001",
    controlId: "A.9.2.3",
    controlName: "Management of Privileged Access Rights",
    description: "Allocation and use of privileged access rights is restricted and controlled",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 50,
        validationRules: ["has_privilege_level", "has_justification"],
      },
      {
        type: "policy_enforcement",
        frequency: "daily",
        minRecords: 5,
        validationRules: ["has_privilege_check"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "ISO27001",
    controlId: "A.12.4.1",
    controlName: "Event Logging",
    description: "Event logs recording user activities shall be produced",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 1000,
        validationRules: ["has_user_id", "has_timestamp", "has_event_type"],
      },
    ],
    automationLevel: "full",
  },
];

const GDPR_CONTROLS: ControlMapping[] = [
  {
    framework: "GDPR",
    controlId: "Article30",
    controlName: "Records of Processing Activities",
    description: "Maintain records of processing activities",
    evidenceRequirements: [
      {
        type: "access_log",
        frequency: "continuous",
        minRecords: 100,
        validationRules: ["has_data_subject", "has_processing_purpose"],
      },
      {
        type: "configuration",
        frequency: "monthly",
        minRecords: 1,
        validationRules: ["has_processing_register"],
      },
    ],
    automationLevel: "partial",
  },
  {
    framework: "GDPR",
    controlId: "Article17",
    controlName: "Right to Erasure",
    description: "Data subject rights to erasure",
    evidenceRequirements: [
      {
        type: "change_management",
        frequency: "continuous",
        minRecords: 0,
        validationRules: ["has_erasure_request", "has_completion"],
      },
    ],
    automationLevel: "full",
  },
  {
    framework: "GDPR",
    controlId: "Article32",
    controlName: "Security of Processing",
    description: "Appropriate security measures",
    evidenceRequirements: [
      {
        type: "risk_assessment",
        frequency: "quarterly",
        minRecords: 1,
        validationRules: ["has_risk_identification", "has_mitigation"],
      },
      {
        type: "configuration",
        frequency: "weekly",
        minRecords: 1,
        validationRules: ["has_encryption_config", "has_access_controls"],
      },
    ],
    automationLevel: "partial",
  },
];

// ============================================================================
// EVIDENCE GENERATOR
// ============================================================================

class EvidenceGenerator {
  private evidenceStore: ComplianceEvidence[] = [];
  private controlMappings: Map<ComplianceFramework, ControlMapping[]> = new Map();
  private lastHash: string = "GENESIS";

  constructor() {
    this.controlMappings.set("SOC2", SOC2_CONTROLS);
    this.controlMappings.set("ISO27001", ISO27001_CONTROLS);
    this.controlMappings.set("GDPR", GDPR_CONTROLS);
  }

  /**
   * Generate evidence for a control
   */
  generateEvidence(
    framework: ComplianceFramework,
    controlId: string,
    evidenceType: EvidenceType,
    data: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date
  ): ComplianceEvidence {
    const control = this.getControl(framework, controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found for ${framework}`);
    }

    const evidence: ComplianceEvidence = {
      id: `EVD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      framework,
      controlId,
      controlName: control.controlName,
      evidenceType,
      timestamp: new Date(),
      periodStart,
      periodEnd,
      description: `Evidence for ${control.controlName}`,
      data,
      attestations: [],
      hash: "",
      chainPreviousHash: this.lastHash,
    };

    // Calculate hash
    evidence.hash = this.calculateHash(evidence);
    this.lastHash = evidence.hash;

    this.evidenceStore.push(evidence);
    return evidence;
  }

  /**
   * Add attestation to evidence
   */
  attestEvidence(
    evidenceId: string,
    attesterId: string,
    attesterRole: string,
    statement: string
  ): Attestation {
    const evidence = this.evidenceStore.find(e => e.id === evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`);
    }

    const attestation: Attestation = {
      attesterId,
      attesterRole,
      attestedAt: new Date(),
      statement,
      signature: this.generateSignature(attesterId, statement, evidence.hash),
    };

    evidence.attestations.push(attestation);
    return attestation;
  }

  /**
   * Generate compliance report
   */
  generateReport(
    framework: ComplianceFramework,
    periodStart: Date,
    periodEnd: Date
  ): ComplianceReport {
    const controls = this.controlMappings.get(framework) || [];
    const controlStatuses: ControlStatus[] = [];
    const gaps: ComplianceGap[] = [];

    for (const control of controls) {
      const evidence = this.getEvidenceForControl(
        framework,
        control.controlId,
        periodStart,
        periodEnd
      );

      const requirements = control.evidenceRequirements;
      const issues: string[] = [];
      let status: ControlStatus["status"] = "met";

      for (const req of requirements) {
        const typeEvidence = evidence.filter(e => e.evidenceType === req.type);

        if (typeEvidence.length < req.minRecords) {
          issues.push(
            `Insufficient ${req.type} evidence: ${typeEvidence.length}/${req.minRecords}`
          );
          status = status === "met" ? "partial" : status;
        }

        // Validate evidence
        for (const ev of typeEvidence) {
          for (const rule of req.validationRules) {
            if (!this.validateEvidence(ev, rule)) {
              issues.push(`Evidence ${ev.id} failed validation: ${rule}`);
              status = "partial";
            }
          }
        }
      }

      if (issues.length > 0 && evidence.length === 0) {
        status = "not_met";
      }

      controlStatuses.push({
        controlId: control.controlId,
        controlName: control.controlName,
        status,
        evidenceCount: evidence.length,
        lastEvidenceDate: evidence.length > 0 ? evidence.at(-1)!.timestamp : undefined,
        issues,
      });

      // Create gaps for non-met controls
      if (status === "not_met" || status === "partial") {
        gaps.push({
          controlId: control.controlId,
          severity: status === "not_met" ? "high" : "medium",
          description: issues.join("; "),
          remediation: `Collect additional ${control.evidenceRequirements.map(r => r.type).join(", ")} evidence`,
        });
      }
    }

    // Calculate overall status
    const notMetCount = controlStatuses.filter(c => c.status === "not_met").length;
    const partialCount = controlStatuses.filter(c => c.status === "partial").length;

    let overallStatus: ComplianceReport["overallStatus"] = "compliant";
    if (notMetCount > 0) {
      overallStatus = "non_compliant";
    } else if (partialCount > 0) {
      overallStatus = "partial";
    }

    const recommendations = this.generateRecommendations(gaps);

    const report: ComplianceReport = {
      id: `RPT-${Date.now()}`,
      generatedAt: new Date(),
      framework,
      periodStart,
      periodEnd,
      controls: controlStatuses,
      overallStatus,
      gaps,
      recommendations,
      signature: "",
    };

    report.signature = this.calculateHash(report);

    return report;
  }

  /**
   * Collect evidence automatically from system data
   */
  async collectAutomatedEvidence(
    framework: ComplianceFramework,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ComplianceEvidence[]> {
    const controls = this.controlMappings.get(framework) || [];
    const collected: ComplianceEvidence[] = [];

    for (const control of controls) {
      if (control.automationLevel === "manual") continue;

      for (const req of control.evidenceRequirements) {
        const data = await this.collectEvidenceData(req.type, periodStart, periodEnd);

        if (Object.keys(data).length > 0) {
          const evidence = this.generateEvidence(
            framework,
            control.controlId,
            req.type,
            data,
            periodStart,
            periodEnd
          );
          collected.push(evidence);
        }
      }
    }

    return collected;
  }

  /**
   * Verify evidence chain integrity
   */
  verifyChainIntegrity(): {
    valid: boolean;
    brokenLinks: string[];
  } {
    const brokenLinks: string[] = [];
    let previousHash = "GENESIS";

    for (const evidence of this.evidenceStore) {
      // Verify link to previous
      if (evidence.chainPreviousHash !== previousHash) {
        brokenLinks.push(evidence.id);
      }

      // Verify self-hash
      const recalculatedHash = this.calculateHash({
        ...evidence,
        hash: "",
      });

      if (recalculatedHash !== evidence.hash) {
        brokenLinks.push(evidence.id);
      }

      previousHash = evidence.hash;
    }

    return {
      valid: brokenLinks.length === 0,
      brokenLinks,
    };
  }

  /**
   * Export evidence package
   */
  exportEvidencePackage(
    framework: ComplianceFramework,
    periodStart: Date,
    periodEnd: Date
  ): {
    metadata: Record<string, unknown>;
    evidence: ComplianceEvidence[];
    report: ComplianceReport;
    integrityCheck: { valid: boolean; hash: string };
  } {
    const evidence = this.getEvidenceForFramework(framework, periodStart, periodEnd);
    const report = this.generateReport(framework, periodStart, periodEnd);
    const integrity = this.verifyChainIntegrity();

    const packageData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        framework,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        evidenceCount: evidence.length,
        generator: "SecurityOS Evidence Generator v1.0",
      },
      evidence,
      report,
      integrityCheck: {
        valid: integrity.valid,
        hash: this.calculateHash({ evidence, report }),
      },
    };

    return packageData;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getControl(
    framework: ComplianceFramework,
    controlId: string
  ): ControlMapping | undefined {
    const controls = this.controlMappings.get(framework) || [];
    return controls.find(c => c.controlId === controlId);
  }

  private getEvidenceForControl(
    framework: ComplianceFramework,
    controlId: string,
    periodStart: Date,
    periodEnd: Date
  ): ComplianceEvidence[] {
    return this.evidenceStore.filter(
      e =>
        e.framework === framework &&
        e.controlId === controlId &&
        e.periodStart >= periodStart &&
        e.periodEnd <= periodEnd
    );
  }

  private getEvidenceForFramework(
    framework: ComplianceFramework,
    periodStart: Date,
    periodEnd: Date
  ): ComplianceEvidence[] {
    return this.evidenceStore.filter(
      e => e.framework === framework && e.periodStart >= periodStart && e.periodEnd <= periodEnd
    );
  }

  private calculateHash(data: unknown): string {
    const json = JSON.stringify(data, Object.keys(data as object).sort());
    return crypto.createHash("sha256").update(json).digest("hex");
  }

  private generateSignature(attesterId: string, statement: string, evidenceHash: string): string {
    const data = `${attesterId}:${statement}:${evidenceHash}:${Date.now()}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private validateEvidence(evidence: ComplianceEvidence, rule: string): boolean {
    const data = evidence.data;

    switch (rule) {
      case "has_user_id":
        return "userId" in data || "user_id" in data;
      case "has_timestamp":
        return "timestamp" in data || "createdAt" in data;
      case "has_action":
        return "action" in data || "eventType" in data;
      case "has_result":
        return "result" in data || "success" in data || "outcome" in data;
      case "has_policy_id":
        return "policyId" in data || "policy_id" in data;
      case "has_decision":
        return "decision" in data || "effect" in data;
      case "has_approval":
        return "approvedBy" in data || "approved_by" in data || "approval" in data;
      case "has_requester":
        return "requesterId" in data || "requester_id" in data;
      case "has_approver":
        return "approverId" in data || "approver_id" in data;
      case "has_role":
        return "role" in data || "userRole" in data;
      case "has_permission":
        return "permission" in data || "permissions" in data;
      case "has_role_matrix":
        return "roleMatrix" in data || "roles" in data;
      default:
        return true;
    }
  }

  private async collectEvidenceData(
    type: EvidenceType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    // In real implementation, would query actual system data
    // This is a placeholder that shows the structure
    switch (type) {
      case "access_log":
        return {
          type: "access_log_collection",
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          recordCount: 0, // Would be actual count
          sampleRecords: [],
        };
      case "policy_enforcement":
        return {
          type: "policy_enforcement_collection",
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          enforcementCount: 0,
          denialCount: 0,
        };
      case "configuration":
        return {
          type: "configuration_snapshot",
          capturedAt: new Date().toISOString(),
          rbacEnabled: true,
          encryptionEnabled: true,
          auditLoggingEnabled: true,
        };
      default:
        return {};
    }
  }

  private generateRecommendations(gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter(g => g.severity === "critical");
    const highGaps = gaps.filter(g => g.severity === "high");

    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical compliance gaps immediately`);
    }

    if (highGaps.length > 0) {
      recommendations.push(`Prioritize ${highGaps.length} high-severity gaps within 30 days`);
    }

    // Add specific recommendations based on gap types
    const accessGaps = gaps.filter(g => g.controlId.includes("6") || g.controlId.includes("9"));
    if (accessGaps.length > 0) {
      recommendations.push("Enhance access control logging and monitoring");
    }

    const changeGaps = gaps.filter(g => g.controlId.includes("8"));
    if (changeGaps.length > 0) {
      recommendations.push("Implement formal change management process");
    }

    return recommendations;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const evidenceGenerator = new EvidenceGenerator();

/**
 * Generate evidence for a control
 */
export function generateEvidence(
  framework: ComplianceFramework,
  controlId: string,
  evidenceType: EvidenceType,
  data: Record<string, unknown>,
  periodStart: Date,
  periodEnd: Date
): ComplianceEvidence {
  return evidenceGenerator.generateEvidence(
    framework,
    controlId,
    evidenceType,
    data,
    periodStart,
    periodEnd
  );
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(
  framework: ComplianceFramework,
  periodStart: Date,
  periodEnd: Date
): ComplianceReport {
  return evidenceGenerator.generateReport(framework, periodStart, periodEnd);
}

/**
 * Collect automated evidence
 */
export async function collectAutomatedEvidence(
  framework: ComplianceFramework,
  periodStart: Date,
  periodEnd: Date
): Promise<ComplianceEvidence[]> {
  return evidenceGenerator.collectAutomatedEvidence(framework, periodStart, periodEnd);
}

/**
 * Export evidence package
 */
export function exportEvidencePackage(
  framework: ComplianceFramework,
  periodStart: Date,
  periodEnd: Date
): ReturnType<typeof evidenceGenerator.exportEvidencePackage> {
  return evidenceGenerator.exportEvidencePackage(framework, periodStart, periodEnd);
}

/**
 * Verify evidence chain
 */
export function verifyEvidenceChain(): { valid: boolean; brokenLinks: string[] } {
  return evidenceGenerator.verifyChainIntegrity();
}
