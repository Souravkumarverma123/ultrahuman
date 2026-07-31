import { db, eq, and, lt, asc, desc, isNull, or, chatMessages } from "@repo/database";

export interface ChatMessage {
  id: string;
  userId: string;
  threadId?: string | null;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[] | null;
  createdAt?: Date;
}

export interface ChatThreadSummary {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

export class ChatMessageRepository {
  public async findByUserId(userId: string, limit?: number): Promise<ChatMessage[]> {
    let query = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.createdAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query;
    return results.map((m) => ({
      id: m.id,
      userId: m.userId,
      threadId: m.threadId,
      role: m.role as "user" | "assistant",
      content: m.content,
      toolsUsed: m.toolsUsed as string[] | undefined,
      createdAt: m.createdAt,
    }));
  }

  public async findByUserIdAndThread(userId: string, threadId?: string): Promise<ChatMessage[]> {
    const targetThreadId = threadId ?? "default";
    const results = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          targetThreadId === "default"
            ? or(eq(chatMessages.threadId, "default"), isNull(chatMessages.threadId))
            : eq(chatMessages.threadId, targetThreadId)
        )
      )
      .orderBy(asc(chatMessages.createdAt));

    return results.map((m) => ({
      id: m.id,
      userId: m.userId,
      threadId: m.threadId ?? "default",
      role: m.role as "user" | "assistant",
      content: m.content,
      toolsUsed: m.toolsUsed as string[] | undefined,
      createdAt: m.createdAt,
    }));
  }

  public async getThreadsForUser(userId: string): Promise<ChatThreadSummary[]> {
    const allMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.createdAt));

    const threadMap = new Map<string, { title: string; updatedAt: Date; count: number }>();

    for (const m of allMessages) {
      const tid = m.threadId || "default";
      const existing = threadMap.get(tid);
      const cleanedText = m.content
        .replace(/%%EMAIL_DRAFT%%[\s\S]*?%%END_DRAFT%%/g, "")
        .replace(/%%EMAIL_SENT%%[\s\S]*?%%END_SENT%%/g, "")
        .replace(/%%EMAIL_DRAFTED%%[\s\S]*?%%END_DRAFTED%%/g, "")
        .trim();

      if (!existing) {
        const title = cleanedText
          ? cleanedText.slice(0, 45) + (cleanedText.length > 45 ? "..." : "")
          : "New Conversation";
        threadMap.set(tid, {
          title,
          updatedAt: m.createdAt,
          count: 1,
        });
      } else {
        existing.count += 1;
        if (m.createdAt > existing.updatedAt) {
          existing.updatedAt = m.createdAt;
        }
        // Use first user message if current title is default
        if (existing.title === "New Conversation" && cleanedText && m.role === "user") {
          existing.title = cleanedText.slice(0, 45) + (cleanedText.length > 45 ? "..." : "");
        }
      }
    }

    const summaries: ChatThreadSummary[] = Array.from(threadMap.entries()).map(([id, info]) => ({
      id,
      title: info.title,
      updatedAt: info.updatedAt,
      messageCount: info.count,
    }));

    // Sort by latest activity first
    summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return summaries;
  }

  public async create(message: Omit<ChatMessage, "createdAt">): Promise<void> {
    await db.insert(chatMessages).values({
      id: message.id,
      userId: message.userId,
      threadId: message.threadId ?? "default",
      role: message.role,
      content: message.content,
      toolsUsed: message.toolsUsed ?? [],
    });
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  public async deleteThread(userId: string, threadId: string): Promise<void> {
    await db.delete(chatMessages).where(
      and(
        eq(chatMessages.userId, userId),
        threadId === "default"
          ? or(eq(chatMessages.threadId, "default"), isNull(chatMessages.threadId))
          : eq(chatMessages.threadId, threadId)
      )
    );
  }

  public async pruneOldMessages(userId: string, olderThan: Date): Promise<void> {
    await db
      .delete(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          lt(chatMessages.createdAt, olderThan)
        )
      );
  }

  public async updateContent(messageId: string, userId: string, newContent: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ content: newContent })
      .where(
        and(
          eq(chatMessages.id, messageId),
          eq(chatMessages.userId, userId)
        )
      );
  }
}
export const chatMessageRepository = new ChatMessageRepository();
