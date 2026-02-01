/**
 * Data Decisions (Stub)
 * Data decision loop was simplified during cleanup.
 */

export interface DataDecisionConfig {
  autopilotMode?: string;
  startLoop?: boolean;
  startHealthMonitor?: boolean;
}

export interface AutonomousLoop {
  start: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
}

export const autonomousLoop: AutonomousLoop = {
  start: async () => {},
  stop: () => {},
  isRunning: () => false,
};

export function initializeDataDecisionSystem(config?: DataDecisionConfig): void {
  // Stub - no-op
}

export function shutdownDataDecisionSystem(): void {
  // Stub - no-op
}

export function startDataDecisionLoop(): Promise<void> {
  return Promise.resolve();
}
