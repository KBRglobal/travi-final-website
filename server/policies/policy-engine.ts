export class PolicyEngine {
  async evaluate(policy: any, context: any) {
    return { allowed: true, reason: "" };
  }
  async getApplicablePolicies(resource: string) {
    return [];
  }
}
export const policyEngine = new PolicyEngine();

export async function getEnforcementSummary() {
  return {
    totalEvaluations: 0,
    allowed: 0,
    denied: 0,
    activePolicies: 0,
  };
}
