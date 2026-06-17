import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  dodoCheckoutSessionId: text("dodo_checkout_session_id").notNull().unique(),
  dodoPaymentId: text("dodo_payment_id"),
  dodoSubscriptionId: text("dodo_subscription_id"),
  amount: integer("amount").notNull(), // Amount in subunits (e.g., cents or paise)
  status: text("status").notNull().default("pending"), // 'pending' | 'success' | 'failed'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

