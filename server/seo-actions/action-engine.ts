// Stub - SEO Action Engine disabled

export type AutopilotMode = "off" | "suggest" | "auto" | "disabled" | "supervised" | "full";

export class SEOActionEngine {
  private mode: AutopilotMode = "off";

  async run(_config?: unknown): Promise<void> {}
  getStatus() {
    return { running: false };
  }
  async getActions(_contentId?: string) {
    return [];
  }
  async executeAction(_action: SEOAction): Promise<void> {}
  async executeActions(_actions: SEOAction[]): Promise<void> {}
  async evaluateContent(_contentId: string): Promise<SEOAction[]> {
    return [];
  }
  async getPendingActions(): Promise<SEOAction[]> {
    return [];
  }
  async validatePrePublish(_contentId: string): Promise<{
    canPublish: boolean;
    blocks: string[];
    warnings: string[];
    requiredActions: SEOAction[];
  }> {
    return { canPublish: true, blocks: [], warnings: [], requiredActions: [] };
  }
  setAutopilotMode(mode: AutopilotMode): void {
    this.mode = mode;
  }
  getAutopilotMode(): AutopilotMode {
    return this.mode;
  }
}

export const seoActionEngine = new SEOActionEngine();

export interface SEOAction {
  id: string;
  type: string;
  status: string;
  contentId?: string;
  priority?: number;
}
