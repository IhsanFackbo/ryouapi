import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from './env';
import { sql } from 'drizzle-orm';

export type Note = { id: number; title: string; content: string; created_at: string; updated_at: string };

let dbSingleton: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL belum diset');
  if (dbSingleton) return dbSingleton;
  const client = neon(env.DATABASE_URL);
  dbSingleton = drizzle(client);
  return dbSingleton;
}

// Create table if not exists (idempotent)
export async function ensureSchema() {
  const db = getDb();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);
}
