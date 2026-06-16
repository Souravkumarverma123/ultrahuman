import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  toolsUsed: jsonb("tools_used").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
