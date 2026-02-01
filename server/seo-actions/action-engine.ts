/**
 * SEO Action Engine (Stub)
 * SEO automation was simplified during cleanup.
 */

export type AutopilotMode = 'off' | 'suggest' | 'auto';

export interface SEOAction {
  id: string;
  type: string;
  target: string;
  status: 'pending' | 'completed' | 'failed';
}

export class SEOActionEngine {
  private mode: AutopilotMode = 'off';
  private isRunning = false;

  constructor(mode?: AutopilotMode) {
    this.mode = mode || 'off';
  }

  start(): Promise<void> {
    this.isRunning = true;
    return Promise.resolve();
  }

  stop(): void {
    this.isRunning = false;
  }

  getMode(): AutopilotMode {
    return this.mode;
  }

  setMode(mode: AutopilotMode): void {
    this.mode = mode;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async executeAction(action: SEOAction): Promise<void> {
    // Stub - no-op
  }
}
