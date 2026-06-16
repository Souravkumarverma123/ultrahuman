import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    alias: {
      "@repo/database": path.resolve(__dirname, "./packages/database"),
      "@repo/logger": path.resolve(__dirname, "./packages/logger"),
      "@repo/auth": path.resolve(__dirname, "./packages/auth"),
      "@repo/trpc": path.resolve(__dirname, "./packages/trpc"),
      "@repo/services": path.resolve(__dirname, "./packages/services"),
      "@repo/utils": path.resolve(__dirname, "./packages/utils"),
      "~": path.resolve(__dirname, "./apps/web"),
    },
  },
});
