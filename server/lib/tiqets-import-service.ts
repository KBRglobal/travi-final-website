// Stub - Tiqets import service
export class TiqetsImportService {
  async findAllCityIds(
    _log?: (msg: string) => void
  ): Promise<{ found: number; total: number; details: any[] }> {
    return { found: 0, total: 0, details: [] };
  }
  async importCity(
    _cityId: string,
    _cityName: string,
    _log?: (msg: string) => void
  ): Promise<{ imported: number }> {
    return { imported: 0 };
  }
  async importAllCities(_log?: (msg: string) => void): Promise<{ imported: number }> {
    return { imported: 0 };
  }
}
export const tiqetsImportService = new TiqetsImportService();
