import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table - mirrors Supabase users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscriptionTier: text("subscription_tier").notNull().default("unlimited"), // In dev mode, everyone is unlimited
  subscriptionStatus: text("subscription_status").notNull().default("active"),
  polarCustomerId: text("polar_customer_id"),
  subscriptionId: text("subscription_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// User rate limits table - mirrors Supabase user_rate_limits table
export const userRateLimits = sqliteTable("user_rate_limits", {
  userId: text("user_id")
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usageCount: integer("usage_count").notNull().default(0),
  resetDate: text("reset_date").notNull(), // Store as ISO date string
  lastRequestAt: integer("last_request_at", { mode: "timestamp" }),
  tier: text("tier").notNull().default("unlimited"),
});

// Chat sessions table - mirrors Supabase chat_sessions table
export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }),
});

// Chat messages table - mirrors Supabase chat_messages table
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(), // JSON string of message parts
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  processingTimeMs: integer("processing_time_ms"),
});

// Charts table - mirrors Supabase charts table
export const charts = sqliteTable("charts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  anonymousId: text("anonymous_id"),
  sessionId: text("session_id").notNull(),
  chartData: text("chart_data").notNull(), // JSON string of chart config
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// CSVs table - mirrors Supabase csvs table
export const csvs = sqliteTable("csvs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  anonymousId: text("anonymous_id"),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  headers: text("headers").notNull(), // JSON array of strings
  rows: text("rows").notNull(), // JSON array of arrays
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type Chart = typeof charts.$inferSelect;
export type InsertChart = typeof charts.$inferInsert;
export type CSV = typeof csvs.$inferSelect;
export type InsertCSV = typeof csvs.$inferInsert;
