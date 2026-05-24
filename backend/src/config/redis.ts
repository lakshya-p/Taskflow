import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

let redis: Redis | null = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false
  });

  redis.on("error", (error) => {
    logger.warn({ error: error.message }, "Redis unavailable; continuing without cache");
  });
}

export const getRedis = async (): Promise<Redis | null> => {
  if (!redis) return null;
  if (redis.status === "ready") return redis;
  try {
    await redis.connect();
    return redis;
  } catch (error) {
    logger.warn({ error }, "Redis connection failed");
    return null;
  }
};

export const closeRedis = async () => {
  if (!redis) return;
  redis.disconnect();
};
