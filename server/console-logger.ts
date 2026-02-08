import { randomUUID } from "node:crypto";
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
    console.log = (...args: unknown[]) => {
      this.originalConsoleLog(...args);
      this.captureLog("info", args);
    };

    console.warn = (...args: unknown[]) => {
      this.originalConsoleWarn(...args);
      this.captureLog("warn", args);
    };

    console.error = (...args: unknown[]) => {
      this.originalConsoleError(...args);
      this.captureLog("error", args);
    };
  }

  private captureLog(level: LogLevel, args: unknown[]) {
    const rawMessage = args
      .map(arg =>
        typeof arg === "object" && arg !== null
          ? JSON.stringify(arg)
          : typeof arg === "string"
            ? arg
            : String(arg)
      )
      .join(" ");

    const { category, humanMessage } = this.translateMessage(rawMessage);

    const entry: ConsoleLogEntry = {
      id: `${Date.now()}-${randomUUID().slice(0, 9)}`,
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
    return (
      this.translateAutoPilot(raw) ??
      this.translateRss(raw) ??
      this.translateExpress(raw) ??
      this.translateAuth(raw) ??
      this.translateAi(raw) ??
      this.translateSimpleCategory(raw) ?? {
        category: "system",
        humanMessage: raw.length > 200 ? raw.substring(0, 200) + "..." : raw,
      }
    );
  }

  private translateAutoPilot(raw: string): { category: string; humanMessage: string } | null {
    if (raw.includes("[AutoPilot Scheduler]")) {
      if (raw.includes("Running hourly"))
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Starting scheduled hourly tasks",
        };
      if (raw.includes("completed"))
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Scheduled tasks completed successfully",
        };
      return {
        category: "autopilot",
        humanMessage: raw.replace("[AutoPilot Scheduler]", "AutoPilot:").trim(),
      };
    }
    if (raw.includes("[AutoPilot]")) {
      if (raw.includes("Running hourly"))
        return {
          category: "autopilot",
          humanMessage: "AutoPilot: Processing hourly automation tasks",
        };
      if (raw.includes("completed"))
        return { category: "autopilot", humanMessage: "AutoPilot: All tasks finished" };
      return {
        category: "autopilot",
        humanMessage: raw.replace("[AutoPilot]", "AutoPilot:").trim(),
      };
    }
    return null;
  }

  private translateRss(raw: string): { category: string; humanMessage: string } | null {
    if (!raw.includes("[RSS Auto-Process]") && !raw.includes("[rss]")) return null;

    const feedMatch = /Feed "([^"]+)" returned (\d+) items?/.exec(raw);
    if (feedMatch) {
      const [, feedName, count] = feedMatch;
      return count === "0"
        ? { category: "rss", humanMessage: `RSS: Checked "${feedName}" - no new articles` }
        : {
            category: "rss",
            humanMessage: `RSS: Found ${count} new article(s) from "${feedName}"`,
          };
    }
    if (raw.includes("Running initial"))
      return { category: "rss", humanMessage: "RSS: Starting to check all feeds for new articles" };
    const countMatch = /Processing (\d+) active feeds/.exec(raw);
    if (countMatch)
      return { category: "rss", humanMessage: `RSS: Checking ${countMatch[1]} active news feeds` };
    return { category: "rss", humanMessage: raw.replace(/\[RSS[^\]]*\]/, "RSS:").trim() };
  }

  private translateExpress(raw: string): { category: string; humanMessage: string } | null {
    const expressMatch = /\[express\]\s+(\w+)\s+([^\s]+)\s+(\d+)\s+in\s+(\d+)ms/.exec(raw);
    if (!expressMatch) return null;

    const [, method, reqPath, status, time] = expressMatch;
    const statusNum = Number.parseInt(status);
    const STATUS_MAP: Record<number, string> = {
      304: "Not Modified",
      401: "Not Logged In",
      404: "Not Found",
    };
    let statusText = STATUS_MAP[statusNum] ?? "OK";
    if (!(statusNum in STATUS_MAP)) {
      if (statusNum >= 500) statusText = "Server Error";
      else if (statusNum >= 400) statusText = "Client Error";
    }

    let simplePath = reqPath;
    if (reqPath.startsWith("/api/admin/"))
      simplePath = "Admin: " + reqPath.replace("/api/admin/", "");
    else if (reqPath.startsWith("/api/public/"))
      simplePath = "Public: " + reqPath.replace("/api/public/", "");
    else if (reqPath.startsWith("/api/")) simplePath = reqPath.replace("/api/", "");

    return {
      category: "http",
      humanMessage: `HTTP ${method} ${simplePath} → ${status} ${statusText} (${time}ms)`,
    };
  }

  private translateAuth(raw: string): { category: string; humanMessage: string } | null {
    if (!raw.includes("login") && !raw.includes("Login") && !raw.includes("authenticated"))
      return null;
    if (raw.includes("success") || raw.includes("Success"))
      return { category: "auth", humanMessage: "Auth: User logged in successfully" };
    if (raw.includes("failed") || raw.includes("Failed") || raw.includes("invalid"))
      return { category: "auth", humanMessage: "Auth: Login attempt failed" };
    return { category: "auth", humanMessage: raw };
  }

  private translateAi(raw: string): { category: string; humanMessage: string } | null {
    const isAi =
      raw.includes("[AI]") ||
      raw.includes("OpenAI") ||
      raw.includes("Anthropic") ||
      raw.includes("generating") ||
      raw.includes("Generated");
    if (!isAi) return null;
    if (raw.includes("success") || raw.includes("completed"))
      return { category: "ai", humanMessage: "AI: Content generated successfully" };
    if (raw.includes("error") || raw.includes("failed") || raw.includes("Error"))
      return { category: "ai", humanMessage: "AI: Generation failed - " + raw.substring(0, 100) };
    if (raw.includes("starting") || raw.includes("Starting"))
      return { category: "ai", humanMessage: "AI: Starting content generation" };
    return { category: "ai", humanMessage: raw.substring(0, 150) };
  }

  private translateSimpleCategory(raw: string): { category: string; humanMessage: string } | null {
    if (raw.includes("[Image]") || raw.includes("upload") || raw.includes("Upload"))
      return { category: "images", humanMessage: raw.substring(0, 150) };
    if (
      raw.includes("[db]") ||
      raw.includes("database") ||
      raw.includes("Database") ||
      raw.includes("query")
    )
      return { category: "database", humanMessage: raw.substring(0, 150) };
    if (raw.includes("[vite]")) {
      if (raw.includes("hmr update"))
        return { category: "dev", humanMessage: "Dev: Files updated (hot reload)" };
      if (raw.includes("invalidate"))
        return { category: "dev", humanMessage: "Dev: Page refresh required" };
      return { category: "dev", humanMessage: raw.replace("[vite]", "Dev:").trim() };
    }
    if (raw.includes("listening") || raw.includes("started") || raw.includes("Server"))
      return { category: "server", humanMessage: raw };
    return null;
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
      id: `${Date.now()}-${randomUUID().slice(0, 9)}`,
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
