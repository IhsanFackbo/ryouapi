import { env } from './env';
import { Redis } from '@upstash/redis';

let memory = new Map<string, { value: any; expireAt?: number }>();

export type KVResult<T=any> = { ok: true; value: T | null } | { ok: false; error: string };

function now() { return Math.floor(Date.now() / 1000); }

export function getKVClient() {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  }
  return null;
}

export async function kvGet(key: string): Promise<KVResult> {
  const client = getKVClient();
  if (client) {
    const value = await client.get(key);
    return { ok: true, value: value ?? null };
  }
  // fallback memory
  const item = memory.get(key);
  if (!item) return { ok: true, value: null };
  if (item.expireAt && item.expireAt < now()) { memory.delete(key); return { ok: true, value: null }; }
  return { ok: true, value: item.value };
}

export async function kvSet(key: string, value: any, ttlSeconds?: number): Promise<KVResult> {
  const client = getKVClient();
  if (client) {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return { ok: true, value: true };
  }
  const item: any = { value };
  if (ttlSeconds && ttlSeconds > 0) item.expireAt = now() + ttlSeconds;
  memory.set(key, item);
  return { ok: true, value: true };
}

export async function kvDel(key: string): Promise<KVResult> {
  const client = getKVClient();
  if (client) {
    await client.del(key);
    return { ok: true, value: true };
  }
  memory.delete(key);
  return { ok: true, value: true };
}
