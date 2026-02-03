export class PolicyEngine {
  async evaluate(policy: any, context: any) { return { allowed: true, reason: '' }; }
  async getApplicablePolicies(resource: string) { return []; }
}
export const policyEngine = new PolicyEngine();
