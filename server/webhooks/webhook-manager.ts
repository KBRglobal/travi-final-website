/**
 * Webhook Manager - Stub Module
 */

interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

class WebhookManager {
  async testWebhook(id: string): Promise<WebhookTestResult> {
    return {
      success: false,
      error: "Webhook testing not configured",
    };
  }
}

export const webhookManager = new WebhookManager();
