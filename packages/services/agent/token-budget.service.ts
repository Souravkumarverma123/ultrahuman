import { db, eq, sql, agentTokenUsage } from "@repo/database";
import OpenAI from "openai";

export interface TokenUsageSummary {
  usageDate: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  remainingTokens: number;
  remainingRequests: number;
}

export class TokenBudgetService {
  private dailyTokenLimit: number;
  private dailyRequestLimit: number;
  private maxInputChars: number;
  private maxOutputTokens: number;
  private historyMessageLimit: number;
  private maxToolRounds: number;
  private maxToolResultChars: number;

  constructor() {
    this.dailyTokenLimit = this.parsePositiveIntegerEnv("AGENT_DAILY_TOKEN_LIMIT", 20_000);
    this.dailyRequestLimit = this.parsePositiveIntegerEnv("AGENT_DAILY_REQUEST_LIMIT", 100);
    this.maxInputChars = this.parsePositiveIntegerEnv("AGENT_MAX_INPUT_CHARS", 2_000);
    this.maxOutputTokens = this.parsePositiveIntegerEnv("AGENT_MAX_OUTPUT_TOKENS", 600);
    this.historyMessageLimit = this.parsePositiveIntegerEnv("AGENT_HISTORY_MESSAGE_LIMIT", 8);
    this.maxToolRounds = this.parsePositiveIntegerEnv("AGENT_MAX_TOOL_ROUNDS", 3);
    this.maxToolResultChars = this.parsePositiveIntegerEnv("AGENT_MAX_TOOL_RESULT_CHARS", 6_000);
  }

  private parsePositiveIntegerEnv(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  public getDailyTokenLimit() { return this.dailyTokenLimit; }
  public getDailyRequestLimit() { return this.dailyRequestLimit; }
  public getMaxInputChars() { return this.maxInputChars; }
  public getMaxOutputTokens() { return this.maxOutputTokens; }
  public getHistoryMessageLimit() { return this.historyMessageLimit; }
  public getMaxToolRounds() { return this.maxToolRounds; }
  public getMaxToolResultChars() { return this.maxToolResultChars; }

  public getUsageDateKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  public getUsageId(userId: string, usageDate = this.getUsageDateKey()): string {
    return `${userId}:${usageDate}`;
  }

  public estimateTokensFromText(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private messageText(message: OpenAI.Chat.ChatCompletionMessageParam): string {
    const content = message.content;
    if (typeof content === "string") return content;
    if (!content) return "";
    return JSON.stringify(content);
  }

  public estimateMessagesTokens(messages: OpenAI.Chat.ChatCompletionMessageParam[]): number {
    return messages.reduce((total, message) => total + this.estimateTokensFromText(this.messageText(message)) + 8, 0);
  }

  public truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}\n\n[Tool result truncated to control assistant token usage.]`;
  }

  public async getSummary(userId: string): Promise<TokenUsageSummary> {
    const usageDate = this.getUsageDateKey();
    const [usage] = await db
      .select()
      .from(agentTokenUsage)
      .where(eq(agentTokenUsage.id, this.getUsageId(userId, usageDate)))
      .limit(1);

    const requestCount = usage?.requestCount ?? 0;
    const promptTokens = usage?.promptTokens ?? 0;
    const completionTokens = usage?.completionTokens ?? 0;
    const totalTokens = usage?.totalTokens ?? 0;

    return {
      usageDate,
      requestCount,
      promptTokens,
      completionTokens,
      totalTokens,
      dailyTokenLimit: this.dailyTokenLimit,
      dailyRequestLimit: this.dailyRequestLimit,
      remainingTokens: Math.max(0, this.dailyTokenLimit - totalTokens),
      remainingRequests: Math.max(0, this.dailyRequestLimit - requestCount),
    };
  }

  public hasBudget(summary: TokenUsageSummary, estimatedTokens: number) {
    if (summary.remainingTokens < estimatedTokens) {
      return {
        allowed: false,
        reply: `You've reached today's assistant token budget. Used ${summary.totalTokens}/${summary.dailyTokenLimit} tokens, with ${summary.remainingTokens} remaining. Please try again tomorrow or ask a shorter email/calendar request.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Atomically reserves a request slot for the day. Prevents concurrent
   * requests from racing past the daily request limit (TOCTOU). The
   * conditional upsert only increments when under the limit; if the limit is
   * already reached the row is not updated and `returning()` yields nothing.
   * Request count is reserved here, so recordUsage() only accounts for tokens.
   */
  public async reserveRequest(userId: string): Promise<{ allowed: boolean; requestCount: number }> {
    const usageDate = this.getUsageDateKey();
    const id = this.getUsageId(userId, usageDate);

    const result = await db
      .insert(agentTokenUsage)
      .values({
        id,
        userId,
        usageDate,
        requestCount: 1,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      })
      .onConflictDoUpdate({
        target: agentTokenUsage.id,
        set: {
          requestCount: sql`${agentTokenUsage.requestCount} + 1`,
          updatedAt: new Date(),
        },
        setWhere: sql`${agentTokenUsage.requestCount} < ${this.dailyRequestLimit}`,
      })
      .returning({ requestCount: agentTokenUsage.requestCount });

    if (result.length === 0) {
      return { allowed: false, requestCount: this.dailyRequestLimit };
    }
    return { allowed: true, requestCount: result[0]!.requestCount };
  }

  public async recordUsage({
    userId,
    promptTokens,
    completionTokens,
    totalTokens,
  }: {
    userId: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }): Promise<void> {
    const usageDate = this.getUsageDateKey();

    await db
      .insert(agentTokenUsage)
      .values({
        id: this.getUsageId(userId, usageDate),
        userId,
        usageDate,
        requestCount: 0,
        promptTokens,
        completionTokens,
        totalTokens,
      })
      .onConflictDoUpdate({
        target: agentTokenUsage.id,
        set: {
          promptTokens: sql`${agentTokenUsage.promptTokens} + ${promptTokens}`,
          completionTokens: sql`${agentTokenUsage.completionTokens} + ${completionTokens}`,
          totalTokens: sql`${agentTokenUsage.totalTokens} + ${totalTokens}`,
          updatedAt: new Date(),
        },
      });
  }
}
export const tokenBudgetService = new TokenBudgetService();
