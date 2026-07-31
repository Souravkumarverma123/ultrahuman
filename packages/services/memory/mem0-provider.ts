import { logger } from "@repo/logger";
import type { MemoryContext, MemoryProvider, MemorySearchResult } from "./types";

/**
 * Mem0 Cloud implementation of the MemoryProvider interface.
 *
 * All Mem0 SDK usage is contained within this single file.
 * If MEM0_API_KEY is not configured, every operation gracefully
 * no-ops (returns empty results, logs a warning once).
 */
export class Mem0CloudProvider implements MemoryProvider {
  private client: any | null = null;
  private initWarned = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      if (!this.initWarned) {
        logger.info("[Mem0] MEM0_API_KEY not set — memory features disabled. Set it in .env to enable long-term memory.");
        this.initWarned = true;
      }
      return;
    }

    try {
      // Dynamic import is avoided because mem0ai is a standard CJS/ESM package.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MemoryClient = require("mem0ai").default ?? require("mem0ai").MemoryClient;
      this.client = new MemoryClient({ apiKey });
      logger.info("[Mem0] Memory client initialized successfully.");
    } catch (err) {
      logger.error("[Mem0] Failed to initialize MemoryClient:", { err });
      this.client = null;
    }
  }

  private isAvailable(): boolean {
    return this.client !== null;
  }

  async addMemory(
    context: MemoryContext,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client.add(messages, {
        userId: context.userId,
      });
      logger.debug("[Mem0] Memories added for user:", { userId: context.userId });
    } catch (err) {
      logger.error("[Mem0] Failed to add memories:", { userId: context.userId, err });
    }
  }

  async searchMemory(
    context: MemoryContext,
    query: string,
    topK = 5,
  ): Promise<MemorySearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const results = await this.client.search(query, {
        filters: {
          AND: [{ user_id: context.userId }],
        },
        topK,
      });

      // Normalize the response — Mem0 returns { results: [...] }
      const items = results?.results ?? results ?? [];
      return (items as any[]).map((item: any) => ({
        id: item.id ?? "",
        memory: item.memory ?? "",
        score: item.score,
        metadata: item.metadata,
        categories: item.categories,
        createdAt: item.created_at,
      }));
    } catch (err) {
      logger.error("[Mem0] Failed to search memories:", { userId: context.userId, err });
      return [];
    }
  }

  async deleteMemory(
    context: MemoryContext,
    memoryId: string,
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client.delete(memoryId);
      logger.debug("[Mem0] Memory deleted:", { memoryId, userId: context.userId });
    } catch (err) {
      logger.error("[Mem0] Failed to delete memory:", { memoryId, userId: context.userId, err });
    }
  }

  async deleteAllMemories(
    context: MemoryContext,
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client.deleteAll({ userId: context.userId });
      logger.debug("[Mem0] All memories deleted for user:", { userId: context.userId });
    } catch (err) {
      logger.error("[Mem0] Failed to delete all memories:", { userId: context.userId, err });
    }
  }

  async getAllMemories(
    context: MemoryContext,
  ): Promise<MemorySearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const results = await this.client.getAll({
        filters: {
          AND: [{ user_id: context.userId }],
        },
      });

      // Normalize — Mem0 may return { results: [...] } or an array directly
      const items = results?.results ?? results ?? [];
      return (items as any[]).map((item: any) => ({
        id: item.id ?? "",
        memory: item.memory ?? "",
        score: item.score,
        metadata: item.metadata,
        categories: item.categories,
        createdAt: item.created_at,
      }));
    } catch (err) {
      logger.error("[Mem0] Failed to get all memories:", { userId: context.userId, err });
      return [];
    }
  }
}
