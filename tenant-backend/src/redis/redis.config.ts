import { Redis, type RedisOptions } from 'ioredis';

/** BullMQ worker tuning — long drainDelay avoids hammering Upstash on idle queues. */
export const BULL_WORKER_OPTIONS = {
  concurrency: 1,
  drainDelay: 120_000,
  stalledInterval: 300_000,
  lockDuration: 300_000,
} as const;

export function isBullWorkersEnabled(): boolean {
  return process.env.ENABLE_BULL_WORKERS === 'true';
}

export function getRedisUrl(): string {
  const url = process.env.UPSTASH_REDIS_URL?.trim();
  if (!url) {
    throw new Error('UPSTASH_REDIS_URL is not defined. Check your .env file.');
  }
  return url;
}

export function createRedisConnectionOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 2000, 15_000);
    },
    reconnectOnError(err) {
      const msg = err?.message ?? '';
      if (msg.includes('max requests limit exceeded')) {
        return false;
      }
      return true;
    },
  };
}

export function createRedisClient(): Redis {
  const client = new Redis(getRedisUrl(), createRedisConnectionOptions());

  client.on('error', (err) => {
    const msg = err?.message ?? String(err);
    if (msg.includes('max requests limit exceeded')) {
      console.error(
        '[Redis] Upstash monthly command limit reached. Background workers should be disabled (ENABLE_BULL_WORKERS=false) or upgrade your Upstash plan.',
      );
      return;
    }
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
