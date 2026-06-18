import { Redis, type RedisOptions } from 'ioredis';

export function getRedisUrl(): string {
  const upstashUrl = process.env.UPSTASH_REDIS_URL?.trim();
  const redisUrl = process.env.REDIS_URL?.trim();
  
  if (redisUrl) return redisUrl;
  if (upstashUrl) return upstashUrl;
  
  return 'redis://localhost:6379';
}

export function createRedisConnectionOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 2000, 15_000);
    },
  };
}

export function createRedisClient(): Redis {
  const client = new Redis(getRedisUrl(), createRedisConnectionOptions());

  client.on('error', (err) => {
    const msg = err?.message ?? String(err);
    console.error('[Redis] connection error:', msg);
  });

  return client;
}

export function createBullConnection(): RedisOptions & { url: string } {
  return {
    url: getRedisUrl(),
    ...createRedisConnectionOptions(),
  };
}
