import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table - mirrors Supabase users table
// Note: All users must authenticate with Valyu OAuth. Credits are handled by Valyu Platform.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
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

// Charts table - mirrors Supabase charts table (requires authenticated user)
export const charts = sqliteTable("charts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  chartData: text("chart_data").notNull(), // JSON string of chart config
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// CSVs table - mirrors Supabase csvs table (requires authenticated user)
export const csvs = sqliteTable("csvs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

// Reports table - async Valyu DeepResearch workflow runs (domain workflows feature)
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workflowSlug: text("workflow_slug").notNull(),
  workflowVersion: integer("workflow_version"),
  workflowParams: text("workflow_params").notNull(), // JSON object of variable values
  mode: text("mode").notNull(), // fast | standard | heavy | max
  title: text("title").notNull(),
  estimatedTime: text("estimated_time"), // e.g. "7-12 min" (per-workflow, displayed)
  valyuTaskId: text("valyu_task_id"), // Valyu deepresearch_id (null until created)
  status: text("status").notNull(), // queued | running | completed | failed | cancelled
  output: text("output"), // markdown report, null until completed
  sources: text("sources"), // JSON array of sources, null until completed
  pdfUrl: text("pdf_url"), // public Valyu pdf_url (storage.valyu.ai), null until completed
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
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
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
