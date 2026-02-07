// Stub - SEO Engine Autopilot disabled
export function startAutopilot() {
  /* empty */
}
export function stopAutopilot() {
  /* empty */
}
export function getAutopilotStatus() {
  return { running: false, mode: "disabled" };
}
export function getAutopilot(_config?: unknown) {
  return {
    start: () => {},
    stop: () => {},
    status: () => ({ running: false, mode: "disabled" }),
    runCycle: () => Promise.resolve(),
    getStatus: () => ({ running: false, mode: "disabled" }),
  };
}
export const seoAutopilot = {
  start: () => {},
  stop: () => {},
  status: () => ({ running: false, mode: "disabled" }),
  runCycle: () => Promise.resolve(),
  getStatus: () => ({ running: false, mode: "disabled" }),
};
