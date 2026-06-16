import { db, eq, and, lt, asc, chatMessages } from "@repo/database";

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[] | null;
  createdAt?: Date;
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
      role: m.role as "user" | "assistant",
      content: m.content,
      toolsUsed: m.toolsUsed as string[] | undefined,
      createdAt: m.createdAt,
    }));
  }

  public async create(message: Omit<ChatMessage, "createdAt">): Promise<void> {
    await db.insert(chatMessages).values({
      id: message.id,
      userId: message.userId,
      role: message.role,
      content: message.content,
      toolsUsed: message.toolsUsed ?? [],
    });
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
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
}
export const chatMessageRepository = new ChatMessageRepository();
