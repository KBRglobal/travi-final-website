export class PartnerDashboardService {
  async getStats(partnerId: string) { return { clicks: 0, conversions: 0, revenue: 0 }; }
  async getPartners() { return []; }
}
export const partnerDashboardService = new PartnerDashboardService();
