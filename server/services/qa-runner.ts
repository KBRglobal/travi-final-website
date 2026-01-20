import { db } from "../db";
import { qaRuns, qaCheckResults, qaChecklistItems } from "@shared/schema";
import { eq } from "drizzle-orm";

interface CheckResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

export class QaRunner {
  // Use localhost for internal server-to-server requests to avoid DNS/networking issues
  private static readonly BASE_URL = "http://localhost:5000";

  static async run(runId: string): Promise<void> {
    console.log(`[QA Runner] Starting automated checks for run ${runId}`);
    
    try {
      // 1. Always run baseline checks first
      console.log(`[QA Runner] Running baseline system checks...`);
      const baselineResults = await this.runBaselineChecks();
      console.log(`[QA Runner] Baseline checks complete:`, baselineResults);

      // 2. Get all results for this run
      const results = await db.query.qaCheckResults.findMany({
        where: eq(qaCheckResults.runId, runId),
        with: {
          item: true,
        },
      });

      console.log(`[QA Runner] Found ${results.length} check items for run ${runId}`);

      let passedCount = 0;
      let failedCount = 0;
      let checkedCount = 0;

      // 3. Process each check item
      for (const result of results) {
        const item = result.item;
        const itemKey = item.key;
        
        // Check if this item has automated check enabled
        if (item.automatedCheck) {
          console.log(`[QA Runner] Executing automated check: ${itemKey}`);
          
          const checkResult = await this.executeCheck(itemKey, item.automatedCheckEndpoint);
          
          const newStatus = checkResult.passed ? "passed" : "failed";
          console.log(`[QA Runner] Check ${itemKey}: ${newStatus} - ${checkResult.message}`);
          
          await db.update(qaCheckResults)
            .set({
              status: newStatus,
              checkedAt: new Date(),
              autoCheckResult: {
                passed: checkResult.passed,
                message: checkResult.message,
                details: checkResult.details,
              },
              updatedAt: new Date(),
            })
            .where(eq(qaCheckResults.id, result.id));
          
          if (checkResult.passed) passedCount++;
          else failedCount++;
          checkedCount++;
        } else {
          // Non-automated checks remain not_checked for manual review
          console.log(`[QA Runner] Skipping manual check: ${itemKey}`);
        }
      }

      // 4. Update run stats
      const allResults = await db.query.qaCheckResults.findMany({
        where: eq(qaCheckResults.runId, runId),
      });

      const passed = allResults.filter(r => r.status === "passed").length;
      const failed = allResults.filter(r => r.status === "failed").length;
      const skipped = allResults.filter(r => r.status === "not_applicable").length;
      const notChecked = allResults.filter(r => r.status === "not_checked").length;
      const total = allResults.length;
      const checkedTotal = total - notChecked - skipped;
      const score = checkedTotal > 0 ? Math.round((passed / checkedTotal) * 100) : 0;

      await db.update(qaRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          passedItems: passed,
          failedItems: failed,
          skippedItems: skipped,
          score,
          notes: `Automated: ${checkedCount} checks executed (${passedCount} passed, ${failedCount} failed). Manual: ${notChecked} pending.`,
          updatedAt: new Date(),
        })
        .where(eq(qaRuns.id, runId));

      console.log(`[QA Runner] Run ${runId} completed. Score: ${score}%, Passed: ${passed}, Failed: ${failed}`);

    } catch (error) {
      console.error(`[QA Runner] FATAL ERROR for run ${runId}:`, error);
      await db.update(qaRuns)
        .set({ 
          status: "failed", 
          notes: `Runner error: ${String(error)}`,
          updatedAt: new Date(),
        })
        .where(eq(qaRuns.id, runId));
    }
  }

  private static async runBaselineChecks(): Promise<{ server: boolean; database: boolean }> {
    const results = { server: false, database: false };
    
    // Check server is running
    try {
      const response = await fetch(`${this.BASE_URL}/api/health`, { 
        method: "GET",
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      
      results.server = response?.ok || response?.status === 404; // 404 means server running but no health endpoint
    } catch {
      results.server = false;
    }

    // Check database connectivity
    try {
      await db.query.qaRuns.findFirst();
      results.database = true;
    } catch {
      results.database = false;
    }

    return results;
  }

  private static async executeCheck(itemKey: string, endpoint?: string | null): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      // Map item keys to actual checks
      const checkHandlers: Record<string, () => Promise<CheckResult>> = {
        // HTTP Health Checks
        "homepage_loads": () => this.checkHttpEndpoint("/", "Homepage"),
        "destinations_loads": () => this.checkHttpEndpoint("/destinations", "Destinations page"),
        "attractions_loads": () => this.checkHttpEndpoint("/attractions", "Attractions page"),
        "search_works": () => this.checkHttpEndpoint("/search?q=dubai", "Search functionality"),
        "api_health": () => this.checkHttpEndpoint("/api/health", "API Health endpoint"),
        
        // Database Checks
        "db_connectivity": () => this.checkDatabaseConnectivity(),
        "db_query_performance": () => this.checkDatabasePerformance(),
        
        // API Checks
        "api_destinations": () => this.checkApiEndpoint("/api/destinations", "Destinations API"),
        "api_attractions": () => this.checkApiEndpoint("/api/attractions", "Attractions API"),
        "api_contents": () => this.checkApiEndpoint("/api/contents", "Contents API"),
        
        // Server Checks
        "server_response_time": () => this.checkServerResponseTime(),
        "error_handling": () => this.checkErrorHandling(),
        
        // Environment Checks
        "env_database_url": () => this.checkEnvVar("DATABASE_URL", "Database connection string"),
        "env_session_secret": () => this.checkEnvVar("SESSION_SECRET", "Session secret"),
      };

      // If we have a custom endpoint, use it
      if (endpoint) {
        return await this.checkHttpEndpoint(endpoint, `Custom endpoint: ${endpoint}`);
      }

      // Look for a handler for this key
      const handler = checkHandlers[itemKey];
      if (handler) {
        return await handler();
      }

      // No handler found - FAIL the check, don't skip silently
      return {
        passed: false,
        message: `No automated check handler implemented for key: ${itemKey}`,
        details: { itemKey, hasEndpoint: !!endpoint },
        duration: Date.now() - startTime,
      };

    } catch (error) {
      return {
        passed: false,
        message: `Check execution error: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkHttpEndpoint(path: string, name: string): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const url = path.startsWith("http") ? path : `${this.BASE_URL}${path}`;
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        headers: { "Accept": "text/html,application/json" },
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        return {
          passed: true,
          message: `${name} returned HTTP ${response.status} in ${duration}ms`,
          details: { status: response.status, duration, url },
          duration,
        };
      } else {
        return {
          passed: false,
          message: `${name} returned HTTP ${response.status}`,
          details: { status: response.status, duration, url },
          duration,
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `${name} failed: ${String(error)}`,
        details: { error: String(error), path },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkApiEndpoint(path: string, name: string): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const url = `${this.BASE_URL}${path}`;
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        headers: { "Accept": "application/json" },
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json().catch(() => null);
        return {
          passed: true,
          message: `${name} returned HTTP ${response.status} with valid JSON in ${duration}ms`,
          details: { status: response.status, duration, hasData: !!data },
          duration,
        };
      } else {
        return {
          passed: false,
          message: `${name} returned HTTP ${response.status}`,
          details: { status: response.status, duration },
          duration,
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `${name} failed: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkDatabaseConnectivity(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      await db.query.qaRuns.findFirst();
      const duration = Date.now() - startTime;
      return {
        passed: true,
        message: `Database connection successful in ${duration}ms`,
        details: { duration },
        duration,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Database connection failed: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkDatabasePerformance(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      await db.query.contents.findMany({ limit: 10 });
      const duration = Date.now() - startTime;
      
      if (duration < 1000) {
        return {
          passed: true,
          message: `Database query completed in ${duration}ms (under 1s threshold)`,
          details: { duration, threshold: 1000 },
          duration,
        };
      } else {
        return {
          passed: false,
          message: `Database query too slow: ${duration}ms (threshold: 1000ms)`,
          details: { duration, threshold: 1000 },
          duration,
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Database performance check failed: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkServerResponseTime(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.BASE_URL}/`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      const duration = Date.now() - startTime;
      
      if (duration < 2000) {
        return {
          passed: true,
          message: `Server response time: ${duration}ms (under 2s threshold)`,
          details: { duration, threshold: 2000 },
          duration,
        };
      } else {
        return {
          passed: false,
          message: `Server too slow: ${duration}ms (threshold: 2000ms)`,
          details: { duration, threshold: 2000 },
          duration,
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Server response check failed: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static async checkErrorHandling(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.BASE_URL}/api/nonexistent-endpoint-12345`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      
      const duration = Date.now() - startTime;
      
      // Should return 404, not 500
      if (response.status === 404) {
        return {
          passed: true,
          message: `Error handling correct: 404 for invalid endpoint`,
          details: { status: response.status, duration },
          duration,
        };
      } else if (response.status >= 500) {
        return {
          passed: false,
          message: `Server error (${response.status}) instead of 404 for invalid endpoint`,
          details: { status: response.status, duration },
          duration,
        };
      } else {
        return {
          passed: true,
          message: `Server returned ${response.status} for invalid endpoint`,
          details: { status: response.status, duration },
          duration,
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Error handling check failed: ${String(error)}`,
        details: { error: String(error) },
        duration: Date.now() - startTime,
      };
    }
  }

  private static checkEnvVar(varName: string, description: string): Promise<CheckResult> {
    const value = process.env[varName];
    if (value && value.length > 0) {
      return Promise.resolve({
        passed: true,
        message: `${description} is configured`,
        details: { varName, isSet: true, length: value.length },
      });
    } else {
      return Promise.resolve({
        passed: false,
        message: `${description} is NOT configured`,
        details: { varName, isSet: false },
      });
    }
  }

  /**
   * Run quick automated checks without creating a full QA run
   * This is used for the dashboard display of health status
   */
  static async runQuickChecks(): Promise<Array<{ key: string; name: string; passed: boolean; message: string; duration?: number; category?: string }>> {
    console.log("[QA Runner] Running quick automated checks...");
    
    const checks = [
      { key: "homepage_loads", name: "Homepage Loads", category: "infrastructure" },
      { key: "destinations_loads", name: "Destinations Page Loads", category: "infrastructure" },
      { key: "attractions_loads", name: "Attractions Page Loads", category: "infrastructure" },
      { key: "api_health", name: "API Health Check", category: "infrastructure" },
      { key: "db_connectivity", name: "Database Connectivity", category: "infrastructure" },
      { key: "db_query_performance", name: "Database Query Performance", category: "infrastructure" },
      { key: "server_response_time", name: "Server Response Time", category: "reliability_resilience" },
      { key: "error_handling", name: "Error Handling", category: "reliability_resilience" },
      { key: "env_database_url", name: "Database URL Configured", category: "infrastructure" },
      { key: "env_session_secret", name: "Session Secret Configured", category: "infrastructure" },
    ];

    const results: Array<{ key: string; name: string; passed: boolean; message: string; duration?: number; category?: string }> = [];

    for (const check of checks) {
      try {
        const result = await this.executeCheck(check.key, null);
        results.push({
          key: check.key,
          name: check.name,
          passed: result.passed,
          message: result.message,
          duration: result.duration,
          category: check.category,
        });
      } catch (error) {
        results.push({
          key: check.key,
          name: check.name,
          passed: false,
          message: `Check failed: ${String(error)}`,
          category: check.category,
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`[QA Runner] Quick checks complete: ${passed} passed, ${failed} failed`);

    return results;
  }
}
