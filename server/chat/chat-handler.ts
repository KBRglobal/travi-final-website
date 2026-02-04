// Stub - Chat Handler disabled

export interface ChatRequest {
  message: string;
  context: {
    page: string;
    entityId?: string;
    entityName?: string;
  };
}

export interface ChatResponse {
  answer: string;
  intent: string;
  suggestions: Array<{ type: string; id: string; name: string; slug: string }>;
  nextAction: { type: string; payload: unknown } | null;
  actions?: Array<{ type: string; payload: object }>;
}

export interface ValidationResult {
  valid: boolean;
  request?: ChatRequest;
  error?: string;
}

export function validateChatRequest(_body: unknown): ValidationResult {
  return { valid: false, error: "Chat service disabled" };
}

export async function handleChatRequest(_request: ChatRequest): Promise<ChatResponse> {
  return {
    answer: "Chat service is currently disabled",
    intent: "browse",
    suggestions: [],
    nextAction: null,
  };
}

export interface ChatMetrics {
  totalChatRequests: number;
  fallbacksUsed: number;
  fallbackRate: number;
  fallbackReasons: Record<string, number>;
  lastReset: string;
}

export function getChatMetrics(): ChatMetrics {
  return {
    totalChatRequests: 0,
    fallbacksUsed: 0,
    fallbackRate: 0,
    fallbackReasons: {},
    lastReset: new Date().toISOString(),
  };
}

export function resetChatMetrics(): void {}
