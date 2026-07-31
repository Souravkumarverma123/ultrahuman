/**
 * Memory Provider Abstraction
 *
 * Defines a provider-agnostic interface for long-term user memory.
 * The current implementation uses Mem0 Cloud, but this abstraction
 * allows swapping to self-hosted Mem0 or another provider without
 * changing the rest of the application.
 */

/** Context scoping every memory operation to a specific user/tenant. */
export interface MemoryContext {
  userId: string;
  tenantId?: string;        // reserved for future multi-tenant support
  workspaceId?: string;     // reserved
  conversationId?: string;  // reserved
}

/** A single memory record returned by search or getAll. */
export interface MemorySearchResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown>;
  categories?: string[];
  createdAt?: string;
}

/**
 * Provider interface for long-term memory storage.
 *
 * Every operation is scoped by MemoryContext to ensure tenant isolation.
 * Implementations must never leak memories across users.
 */
export interface MemoryProvider {
  /**
   * Store new memories extracted from a conversation.
   * The provider is responsible for deduplication and inference.
   */
  addMemory(
    context: MemoryContext,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void>;

  /**
   * Semantically search for memories relevant to the given query.
   * Returns only memories belonging to the scoped user.
   */
  searchMemory(
    context: MemoryContext,
    query: string,
    topK?: number,
  ): Promise<MemorySearchResult[]>;

  /** Delete a single memory by its ID. */
  deleteMemory(
    context: MemoryContext,
    memoryId: string,
  ): Promise<void>;

  /** Delete all memories for the scoped user. */
  deleteAllMemories(
    context: MemoryContext,
  ): Promise<void>;

  /** Retrieve all stored memories for the scoped user. */
  getAllMemories(
    context: MemoryContext,
  ): Promise<MemorySearchResult[]>;
}
