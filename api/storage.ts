import { type User, type InsertUser, users } from "../shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// 開発中やテスト用のメモリ保存（必要なら切りかえ可能）
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  constructor() { this.users = new Map(); }
  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser) {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
    };
    this.users.set(id, user);
    return user;
  }
}

// Vercel Postgres / 外部DB用の設定
export class PostgresStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("データベースURLが設定されていません。VercelのSettingsで追加してください。");
    }
    // postgresドライバを初期化
    const client = postgres(process.env.DATABASE_URL);
    this.db = drizzle(client);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
    };
    await this.db.insert(users).values(user);
    return user;
  }
}

// VercelではこちらのPostgres版をエクスポートする
export const storage = new PostgresStorage();