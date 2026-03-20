import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });

// 開発用クリーンアップ関数（任意）
export async function cleanupExpiredCache() {
  const { lt } = await import('drizzle-orm');
  const result = await db
    .delete(schema.uvDataCache)
    .where(lt(schema.uvDataCache.expiresAt, new Date()));
  // Drizzle returns different types depending on version, use any for now
  const count = (result as any).rowCount ?? (result as any).rowsAffected ?? 0;
  console.log(`Cleaned up ${count} expired cache entries`);
}
