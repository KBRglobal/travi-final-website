// Stub - Tiqets API client
export class TiqetsClient {
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Tiqets integration disabled" };
  }
}
export const tiqetsClient = new TiqetsClient();
