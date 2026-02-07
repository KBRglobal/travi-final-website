import { EventEmitter } from "node:events";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  rawMessage: string;
  humanMessage: string;
}

class ConsoleLogger extends EventEmitter {
  private logs: ConsoleLogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly originalConsoleLog: typeof console.log;
  private readonly originalConsoleWarn: typeof console.warn;
  private readonly originalConsoleError: typeof console.error;

  constructor() {
    super();
    this.originalConsoleLog = console.log.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
    this.originalConsoleError = console.error.bind(console);
  }

  start() {
    const self = this;

    console.log = (...args: unknown[]) => {
      self.originalConsoleLog(...args);
      self.captureLog("info", args);
    };

    console.warn = (...args: unknown[]) => {
      self.originalConsoleWarn(...args);
      self.captureLog("warn", args);
    };

    console.error = (...args: unknown[]) => {
      self.originalConsoleError(...args);
      self.captureLog("error", args);
    };
  }

  private captureLog(level: LogLevel, args: unknown[]) {
    const rawMessage = args
      .map(arg => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");

    const { category, humanMessage } = this.translateMessage(rawMessage);

    const entry: ConsoleLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      rawMessage,
      humanMessage,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.emit("log", entry);
  }

  private translateMessage(raw: string): { category: string; humanMessage: string } {
    // AutoPilot patterns
    if (raw.includes("[AutoPilot Scheduler]")) {
      if (raw.includes("Running hourly")) {
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Starting scheduled hourly tasks",
        };
      }
      if (raw.includes("completed")) {
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Scheduled tasks completed successfully",
        };
      }
      return {
        category: "autopilot",
        humanMessage: raw.replace("[AutoPilot Scheduler]", "AutoPilot:").trim(),
      };
    }

    if (raw.includes("[AutoPilot]")) {
      if (raw.includes("Running hourly")) {
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Processing hourly automation tasks",
        };
      }
      if (raw.includes("completed")) {
        return { category: "autopilot", humanMessage: "AutoPilot: All tasks finished" };
      }
      return {
        category: "autopilot",
        humanMessage: raw.replace("[AutoPilot]", "AutoPilot:").trim(),
      };
    }

    // RSS patterns
    if (raw.includes("[RSS Auto-Process]") || raw.includes("[rss]")) {
      const feedMatch = /Feed "([^"]+)" returned (\d+) items?/.exec(raw);
      if (feedMatch) {
        const [, feedName, count] = feedMatch;
        if (count === "0") {
          return { category: "rss", humanMessage: `RSS: Checked "${feedName}" - no new articles` };
        }
        return {
          category: "rss",
          humanMessage: `RSS: Found ${count} new article(s) from "${feedName}"`,
        };
      }
      if (raw.includes("Running initial")) {
        return {
          category: "rss",
          humanMessage: "RSS: Starting to check all feeds for new articles",
        };
      }
      if (raw.includes("Processing")) {
        const countMatch = /Processing (\d+) active feeds/.exec(raw);
        if (countMatch) {
          return {
            category: "rss",
            humanMessage: `RSS: Checking ${countMatch[1]} active news feeds`,
          };
        }
      }
      return { category: "rss", humanMessage: raw.replace(/\[RSS[^\]]*\]/, "RSS:").trim() };
    }

    // Express HTTP patterns
    const expressMatch = /\[express\]\s+(\w+)\s+([^\s]+)\s+(\d+)\s+in\s+(\d+)ms/.exec(raw);
    if (expressMatch) {
      const [, method, path, status, time] = expressMatch;
      const statusNum = Number.parseInt(status);
      let statusText = "OK";
      if (statusNum >= 400 && statusNum < 500) statusText = "Client Error";
      if (statusNum >= 500) statusText = "Server Error";
      if (statusNum === 304) statusText = "Not Modified";
      if (statusNum === 401) statusText = "Not Logged In";
      if (statusNum === 404) statusText = "Not Found";

      // Simplify path for readability
      let simplePath = path;
      if (path.startsWith("/api/admin/")) simplePath = "Admin: " + path.replace("/api/admin/", "");
      else if (path.startsWith("/api/public/"))
        simplePath = "Public: " + path.replace("/api/public/", "");
      else if (path.startsWith("/api/")) simplePath = path.replace("/api/", "");

      return {
        category: "http",
        humanMessage: `HTTP ${method} ${simplePath} → ${status} ${statusText} (${time}ms)`,
      };
    }

    // Auth patterns
    if (raw.includes("login") || raw.includes("Login") || raw.includes("authenticated")) {
      if (raw.includes("success") || raw.includes("Success")) {
        return { category: "auth", humanMessage: "Auth: User logged in successfully" };
      }
      if (raw.includes("failed") || raw.includes("Failed") || raw.includes("invalid")) {
        return { category: "auth", humanMessage: "Auth: Login attempt failed" };
      }
      return { category: "auth", humanMessage: raw };
    }

    // AI Generation patterns
    if (
      raw.includes("[AI]") ||
      raw.includes("OpenAI") ||
      raw.includes("Anthropic") ||
      raw.includes("generating") ||
      raw.includes("Generated")
    ) {
      if (raw.includes("success") || raw.includes("completed")) {
        return { category: "ai", humanMessage: "AI: Content generated successfully" };
      }
      if (raw.includes("error") || raw.includes("failed") || raw.includes("Error")) {
        return { category: "ai", humanMessage: "AI: Generation failed - " + raw.substring(0, 100) };
      }
      if (raw.includes("starting") || raw.includes("Starting")) {
        return { category: "ai", humanMessage: "AI: Starting content generation" };
      }
      return { category: "ai", humanMessage: raw.substring(0, 150) };
    }

    // Image patterns
    if (raw.includes("[Image]") || raw.includes("upload") || raw.includes("Upload")) {
      return { category: "images", humanMessage: raw.substring(0, 150) };
    }

    // Database patterns
    if (
      raw.includes("[db]") ||
      raw.includes("database") ||
      raw.includes("Database") ||
      raw.includes("query")
    ) {
      return { category: "database", humanMessage: raw.substring(0, 150) };
    }

    // Vite HMR patterns (development)
    if (raw.includes("[vite]")) {
      if (raw.includes("hmr update")) {
        return { category: "dev", humanMessage: "Dev: Files updated (hot reload)" };
      }
      if (raw.includes("invalidate")) {
        return { category: "dev", humanMessage: "Dev: Page refresh required" };
      }
      return { category: "dev", humanMessage: raw.replace("[vite]", "Dev:").trim() };
    }

    // Server startup
    if (raw.includes("listening") || raw.includes("started") || raw.includes("Server")) {
      return { category: "server", humanMessage: raw };
    }

    // Default - keep original but truncate if too long
    return {
      category: "system",
      humanMessage: raw.length > 200 ? raw.substring(0, 200) + "..." : raw,
    };
  }

  getLogs(limit = 200): ConsoleLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByCategory(category: string, limit = 100): ConsoleLogEntry[] {
    return this.logs.filter(l => l.category === category).slice(-limit);
  }

  clear() {
    this.logs = [];
  }

  addManualLog(level: LogLevel, category: string, message: string) {
    const entry: ConsoleLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      rawMessage: message,
      humanMessage: message,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.emit("log", entry);
  }
}

export const consoleLogger = new ConsoleLogger();
