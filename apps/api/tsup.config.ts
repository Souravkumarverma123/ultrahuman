import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^@repo\//], // transpile all local workspace packages
  external: [
    "@anthropic-ai/claude-agent-sdk",
    "@mastra/core",
    "@mastra/core/tools",
    "@ai-sdk/mcp",
    "@openai/agents",
    "@anthropic-ai/sdk"
  ],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
