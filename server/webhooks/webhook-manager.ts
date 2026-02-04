// Stub - Webhooks disabled
export function sendWebhook(_url: string, _data?: unknown) {
  return Promise.resolve({ sent: false });
}
export function testWebhook(_id: string) {
  return Promise.resolve({ success: false });
}
export function registerWebhook() {}
export const webhookManager = {
  send: (_url: string, _data?: unknown) => Promise.resolve({ sent: false }),
  testWebhook: (_id: string) => Promise.resolve({ success: false }),
};
