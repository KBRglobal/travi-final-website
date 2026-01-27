/**
 * Centralized Log Service
 * Collects logs from all parts of the system for Admin Panel viewing
 */

export type LogLevel = "error" | "warning" | "info" | "debug";

export type LogCategory =
  | "system"
  | "ai"
  | "images"
  | "storage"
  | "rss"
  | "content"
  | "auth"
  | "api"
  | "seo"
  | "publishing";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, unknown>;
  source?: string;
  userId?: string;
  contentId?: string;
  duration?: number;
}

export interface LogFilter {
  level?: LogLevel | LogLevel[];
  category?: LogCategory | LogCategory[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  recentErrors: number;
}

// In-memory log storage (circular buffer)
const MAX_LOGS = 5000;
const logs: LogEntry[] = [];
let logIdCounter = 0;

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  logIdCounter++;
  return `log_${Date.now()}_${logIdCounter}`;
}

/**
 * Add a log entry
 */
export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    id: generateLogId(),
    timestamp: new Date(),
    level,
    category,
    message,
    details,
  };

  // Add to circular buffer
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }

  // Also log to console with formatting
  const levelColors: Record<LogLevel, string> = {
    error: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
    info: "\x1b[36m", // Cyan
    debug: "\x1b[90m", // Gray
  };
  const reset = "\x1b[0m";
  const color = levelColors[level];

  return entry;
}

/**
 * Shorthand logging functions
 */
export const logger = {
  error: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log("error", category, message, details),

  warn: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log("warning", category, message, details),

  info: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log("info", category, message, details),

  debug: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log("debug", category, message, details),

  // Category-specific loggers
  ai: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "ai", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "ai", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "ai", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "ai", message, details),
  },

  images: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "images", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "images", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "images", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "images", message, details),
  },

  storage: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "storage", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "storage", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "storage", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "storage", message, details),
  },

  rss: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "rss", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "rss", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "rss", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "rss", message, details),
  },

  content: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "content", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "content", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "content", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "content", message, details),
  },

  auth: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "auth", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "auth", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "auth", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "auth", message, details),
  },

  api: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "api", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "api", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "api", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "api", message, details),
  },

  seo: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "seo", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "seo", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "seo", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "seo", message, details),
  },

  publishing: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "publishing", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "publishing", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "publishing", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "publishing", message, details),
  },

  system: {
    error: (message: string, details?: Record<string, unknown>) =>
      log("error", "system", message, details),
    warn: (message: string, details?: Record<string, unknown>) =>
      log("warning", "system", message, details),
    info: (message: string, details?: Record<string, unknown>) =>
      log("info", "system", message, details),
    debug: (message: string, details?: Record<string, unknown>) =>
      log("debug", "system", message, details),
  },
};

/**
 * Get logs with filtering
 */
export function getLogs(filter: LogFilter = {}): LogEntry[] {
  let result = [...logs];

  // Filter by level
  if (filter.level) {
    const levels = Array.isArray(filter.level) ? filter.level : [filter.level];
    result = result.filter(log => levels.includes(log.level));
  }

  // Filter by category
  if (filter.category) {
    const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
    result = result.filter(log => categories.includes(log.category));
  }

  // Filter by search text
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    result = result.filter(
      log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {})
          .toLowerCase()
          .includes(searchLower)
    );
  }

  // Filter by date range
  if (filter.startDate) {
    result = result.filter(log => log.timestamp >= filter.startDate!);
  }
  if (filter.endDate) {
    result = result.filter(log => log.timestamp <= filter.endDate!);
  }

  // Apply pagination
  const offset = filter.offset || 0;
  const limit = filter.limit || 100;
  result = result.slice(offset, offset + limit);

  return result;
}

/**
 * Get log statistics
 */
export function getLogStats(): LogStats {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const stats: LogStats = {
    total: logs.length,
    byLevel: {
      error: 0,
      warning: 0,
      info: 0,
      debug: 0,
    },
    byCategory: {
      system: 0,
      ai: 0,
      images: 0,
      storage: 0,
      rss: 0,
      content: 0,
      auth: 0,
      api: 0,
      seo: 0,
      publishing: 0,
    },
    recentErrors: 0,
  };

  for (const log of logs) {
    stats.byLevel[log.level]++;
    stats.byCategory[log.category]++;

    if (log.level === "error" && log.timestamp >= oneHourAgo) {
      stats.recentErrors++;
    }
  }

  return stats;
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logs.length = 0;
}

/**
 * Export logs to JSON
 */
export function exportLogs(filter?: LogFilter): string {
  const data = getLogs(filter);
  return JSON.stringify(data, null, 2);
}

/**
 * Get all available categories
 */
export function getCategories(): LogCategory[] {
  return [
    "system",
    "ai",
    "images",
    "storage",
    "rss",
    "content",
    "auth",
    "api",
    "seo",
    "publishing",
  ];
}

/**
 * Get category display names
 */
export function getCategoryDisplayNames(): Record<LogCategory, string> {
  return {
    system: "System",
    ai: "AI Generation",
    images: "Images",
    storage: "Storage",
    rss: "RSS Feeds",
    content: "Content",
    auth: "Authentication",
    api: "API",
    seo: "SEO",
    publishing: "Publishing",
  };
}
