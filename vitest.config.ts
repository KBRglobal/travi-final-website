import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster tests (alternative to jsdom)
    environment: "happy-dom",
    // Enable globals (describe, it, expect without imports)
    globals: true,
    // Setup files to run before each test file
    setupFiles: ["./tests/setup.ts"],
    // Include patterns for test files
    include: [
      "tests/**/*.{test,spec}.{js,ts,tsx}",
      "client/src/**/*.{test,spec}.{js,ts,tsx}",
      "server/**/*.{test,spec}.{js,ts}",
    ],
    // Exclude patterns
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules",
        "dist",
        "tests/setup.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
        "**/scripts/**",
        "**/migrations/**",
      ],
      // Coverage thresholds - enforced in CI
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
    // Test timeout
    testTimeout: 10000,
    // Hook timeout
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
