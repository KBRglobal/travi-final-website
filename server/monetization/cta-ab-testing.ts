export class CTAABTestingService {
  async getTests() { return []; }
  async getTest(id: string) { return null; }
  async createTest(data: any) { return { id: 'stub', ...data }; }
  async updateTest(id: string, data: any) { return { id, ...data }; }
  async deleteTest(id: string) { return true; }
  async recordConversion(testId: string, variant: string) { return true; }
  async getResults(testId: string) { return { variants: [] }; }
}
export const ctaAbTestingService = new CTAABTestingService();
