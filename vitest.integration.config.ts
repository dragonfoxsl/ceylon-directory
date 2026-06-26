import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run serially — tests share a local Supabase instance
    maxConcurrency: 1,
    sequence: { concurrent: false },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
