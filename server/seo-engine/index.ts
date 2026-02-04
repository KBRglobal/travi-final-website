// Stub - SEO Engine disabled

export class SEOEngine {
  constructor(_config?: unknown) {}
  async generateContentReport(_contentId: string) {
    return null;
  }
  async getStatus() {
    return { isRunning: false };
  }
  async triggerReindexIfNeeded(_contentId: string) {
    return false;
  }
}

let seoEngineInstance: SEOEngine | null = null;

export function getSEOEngine(_config?: unknown): SEOEngine {
  if (!seoEngineInstance) {
    seoEngineInstance = new SEOEngine();
  }
  return seoEngineInstance;
}

export function resetSEOEngine(): void {
  seoEngineInstance = null;
}

// Stub exports for any potential imports
export class SchemaEngine {
  constructor(_config?: unknown) {}
  async generateForContent(_contentId: string) {
    return {};
  }
}
export class CanonicalEngine {
  constructor(_config?: unknown) {}
  async getCanonicalUrl(_contentId: string) {
    return "";
  }
}
export class AEOScoreEngine {
  constructor(_config?: unknown) {}
  async calculate(_contentId: string) {
    return { score: 0 };
  }
}
export class IndexHealthEngine {
  constructor(_config?: unknown) {}
  async getSummary() {
    return {};
  }
}
export class ContentQualityEngine {
  constructor(_config?: unknown) {}
  async analyze(_contentId: string) {
    return { score: 0 };
  }
}
export class InternalLinkingEngine {
  constructor(_config?: unknown) {}
  async getLinksForContent(_contentId: string) {
    return [];
  }
}
export class ReindexEngine {
  constructor(_config?: unknown) {}
  async evaluateAndTrigger(_contentId: string) {
    return false;
  }
}
export class BotMonitorEngine {
  constructor(_config?: unknown) {}
  async getStats() {
    return {};
  }
}
export class SnippetEngine {
  constructor(_config?: unknown) {}
  async analyzeReadiness(_contentId: string) {
    return { score: 0 };
  }
}
