import { getRedis } from "../config/redis";
import { env } from "../config/env";
import { logger } from "./logger";

export class CacheService {
  constructor(private ttlSeconds = 300) {}

  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedis();
    if (!redis) return null;
    try {
      const value = await redis.get(key);
      if (env.NODE_ENV === "development") logger.debug({ key }, value ? "Cache hit" : "Cache miss");
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      logger.warn({ error, key }, "Cache read failed");
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = this.ttlSeconds) {
    const redis = await getRedis();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (error) {
      logger.warn({ error, key }, "Cache write failed");
    }
  }

  async del(key: string) {
    const redis = await getRedis();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn({ error, key }, "Cache delete failed");
    }
  }
}

export const cacheService = new CacheService();
