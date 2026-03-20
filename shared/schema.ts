import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const uvDataCache = pgTable("uv_data_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: varchar("station_id").notNull(),
  date: varchar("date").notNull(),
  rawData: jsonb("raw_data").notNull(),
  processedData: jsonb("processed_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  stationDateUnique: unique("uv_cache_station_date_unique").on(
    table.stationId,
    table.date
  ),
  expiresIdx: index("uv_cache_expires_idx").on(table.expiresAt),
}));

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
