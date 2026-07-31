import { logger } from "@repo/logger";
import { Mem0CloudProvider } from "./mem0-provider";
import type { MemoryContext, MemoryProvider, MemorySearchResult } from "./types";

/**
 * Application-level memory service.
 *
 * Wraps the active MemoryProvider and provides high-level methods
 * for the rest of the application. Currently uses Mem0CloudProvider;
 * swap the provider here to migrate to self-hosted Mem0 or another backend.
 */
export class MemoryService {
  private provider: MemoryProvider;

  constructor(provider?: MemoryProvider) {
    this.provider = provider ?? new Mem0CloudProvider();
  }

  /**
   * Search for memories relevant to the user's current query.
   * Used before building the LLM prompt to inject durable preferences.
   */
  async searchMemory(
    context: MemoryContext,
    query: string,
    topK = 5,
  ): Promise<MemorySearchResult[]> {
    logger.debug("[MemoryService] Searching memories:", {
      userId: context.userId,
      query: query.slice(0, 100),
    });

    const results = await this.provider.searchMemory(context, query, topK);

    logger.debug("[MemoryService] Found memories:", {
      userId: context.userId,
      count: results.length,
    });

    return results;
  }

  /**
   * Extract and store durable memories from a conversation turn.
   *
   * This should be called as a background/fire-and-forget task
   * after the chat response has been sent to the user.
   * Mem0 Cloud handles inference, deduplication, and conflict resolution.
   */
  async extractAndStoreMemories(
    context: MemoryContext,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    logger.debug("[MemoryService] Extracting memories from conversation:", {
      userId: context.userId,
      messageCount: messages.length,
    });

    await this.provider.addMemory(context, messages);
  }

  /**
   * Delete a specific memory by ID.
   * Used when a user wants to forget a specific preference.
   */
  async deleteMemory(
    context: MemoryContext,
    memoryId: string,
  ): Promise<void> {
    logger.info("[MemoryService] Deleting memory:", {
      userId: context.userId,
      memoryId,
    });

    await this.provider.deleteMemory(context, memoryId);
  }

  /**
   * Delete all memories for a user.
   * Used for GDPR-style "forget me" requests.
   */
  async deleteAllMemories(context: MemoryContext): Promise<void> {
    logger.info("[MemoryService] Deleting ALL memories for user:", {
      userId: context.userId,
    });

    await this.provider.deleteAllMemories(context);
  }

  /**
   * Retrieve all stored memories for the user.
   * Used in the memory management UI.
   */
  async getAllMemories(context: MemoryContext): Promise<MemorySearchResult[]> {
    logger.debug("[MemoryService] Getting all memories:", {
      userId: context.userId,
    });

    return this.provider.getAllMemories(context);
  }
}

/** Singleton instance used throughout the application. */
export const memoryService = new MemoryService();
