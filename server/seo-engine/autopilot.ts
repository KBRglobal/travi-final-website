// Stub - SEO Autopilot disabled

export function startAutopilot(): void {}
export function stopAutopilot(): void {}
export function isAutopilotRunning(): boolean {
  return false;
}
export function getAutopilotStatus() {
  return { running: false };
}
export function setAutopilotMode(_mode: string): void {}
export function getAutopilotMode(): string {
  return "off";
}

class AutopilotInstance {
  async runCycle(): Promise<void> {}
  stop(): void {}
  getStatus() {
    return { running: false, mode: "off" };
  }
}

export function getAutopilot(_mode?: string): AutopilotInstance {
  return new AutopilotInstance();
}
