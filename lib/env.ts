export const env = {
  MAX_BYTES: Number(process.env.MAX_BYTES || 100 * 1024 * 1024),
  DATABASE_URL: process.env.DATABASE_URL || "",
  API_KEYS: (process.env.API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean),
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
};
