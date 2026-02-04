// Stub - SEO actions engine disabled
export type AutopilotMode = "off" | "suggest" | "auto" | "supervised" | "full";

export interface SEOAction {
  id: string;
  type: string;
  priority: number;
  status: string;
}

export interface ValidationResult {
  canPublish: boolean;
  blocks: string[];
  warnings: string[];
  requiredActions: SEOAction[];
}

export class SEOActionEngine {
  private mode: AutopilotMode;

  constructor(mode: AutopilotMode = "off") {
    this.mode = mode;
  }

  async executeAction(action: any): Promise<any> {
    return { success: true };
  }
  async executeActions(actions: any[]): Promise<any> {
    return { success: true };
  }
  async getAvailableActions(): Promise<SEOAction[]> {
    return [];
  }
  async getActionHistory(): Promise<any[]> {
    return [];
  }
  async getPendingActions(): Promise<SEOAction[]> {
    return [];
  }
  setAutopilotMode(mode: AutopilotMode): void {
    this.mode = mode;
  }
  getAutopilotMode(): AutopilotMode {
    return this.mode;
  }
  async validatePrePublish(content: any): Promise<ValidationResult> {
    return { canPublish: true, blocks: [], warnings: [], requiredActions: [] };
  }
  async evaluateContent(content: any): Promise<any> {
    return { score: 100 };
  }
}

export const seoActionEngine = new SEOActionEngine();
export async function executeSEOAction(action: any): Promise<any> {
  return { success: true };
}
export async function getSEOActionStatus(): Promise<any> {
  return {};
}
