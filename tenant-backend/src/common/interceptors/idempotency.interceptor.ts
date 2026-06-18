import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';
import { env } from '../../config/env';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private redisClient: any = null;
  private localMemoryCache = new Map<string, { status: string; body: any; expires: number }>();

  constructor(private readonly prisma: PrismaService) {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const Redis = require('ioredis');
      const upstashUrl = process.env.UPSTASH_REDIS_URL;

      this.redisClient = upstashUrl
        ? new Redis(upstashUrl)
        : new Redis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD || undefined,
            tls:
              process.env.REDIS_TLS === 'true' ||
              process.env.REDIS_HOST?.includes('upstash.io')
                ? {}
                : undefined,
            maxRetriesPerRequest: 2,
            connectTimeout: 1500,
          });

      this.redisClient.on('error', (err: any) => {
        this.logger.warn(`Idempotency Redis offline. Scaling lock fallback active: ${err.message}`);
        this.redisClient = null;
      });
    } catch (e) {
      this.logger.warn('ioredis package not found. Scaling lock fallback active.');
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 1. Identify idempotency key header
    const idempotencyKey = request.headers['x-idempotency-key'] || request.headers['X-Idempotency-Key'];
    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `demoz:idempotency:${idempotencyKey}`;
    this.logger.log(`Intercepting request with Idempotency Key: ${idempotencyKey}`);

    // 2. Read lock or cached response
    let cached = await this.readCache(cacheKey);
    if (cached) {
      if (cached === 'LOCKED') {
        this.logger.warn(`Duplicate request detected in execution: ${idempotencyKey}`);
        throw new ConflictException('A duplicate request is already in progress. Please wait.');
      }

      this.logger.log(`Idempotency HIT. Serving cached payload for key: ${idempotencyKey}`);
      response.status(cached.status || HttpStatus.OK);
      response.setHeader('X-Cache-Lookup', 'HIT - IDEMPOTENT');
      return of(cached.body);
    }

    // 3. Acquire atomic execution lock (NX PX 10000 - 10 seconds lock to prevent deadlocks)
    const acquired = await this.acquireLock(cacheKey);
    if (!acquired) {
      this.logger.warn(`Lock collision on key: ${idempotencyKey}`);
      throw new ConflictException('A duplicate request is already in progress. Please wait.');
    }

    return next.handle().pipe(
      tap(async (body) => {
        // 4. Cache successful responses for 24 hours
        const responseData = {
          status: response.statusCode || HttpStatus.OK,
          body,
        };
        await this.writeCache(cacheKey, responseData, 86400); // 24 Hours TTL
      }),
      catchError(async (err) => {
        // 5. Release the lock on failure so the client is allowed to retry
        await this.deleteCache(cacheKey);
        throw err;
      }),
    );
  }

  private async readCache(key: string): Promise<any> {
    if (this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        if (val === 'LOCKED') return 'LOCKED';
        return val ? JSON.parse(val) : null;
      } catch (err) {
        // Fallback silently to memory
      }
    }

    const local = this.localMemoryCache.get(key);
    if (local && local.expires > Date.now()) {
      if (local.status === 'LOCKED') return 'LOCKED';
      return local;
    }
    return null;
  }

  private async acquireLock(key: string): Promise<boolean> {
    if (this.redisClient) {
      try {
        const result = await this.redisClient.set(key, 'LOCKED', 'NX', 'PX', 10000);
        return result === 'OK';
      } catch (err) {
        // Fallback silently
      }
    }

    // Horizontal advisory lock fallback (PostgreSQL) instead of Node process memory Map
    try {
      const result: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT pg_try_advisory_lock(hashtext($1)) as acquired;`,
        key,
      );
      const acquired = result[0]?.acquired === true;
      if (acquired) {
        this.localMemoryCache.set(key, {
          status: 'LOCKED',
          body: null,
          expires: Date.now() + 10000,
        });
      }
      return acquired;
    } catch (err) {
      this.logger.error('Horizontal Postgres Advisory Lock fallback failure:', err);
      // Last-ditch local in-memory fallback
      const existing = this.localMemoryCache.get(key);
      if (existing && existing.expires > Date.now()) {
        return false;
      }
      this.localMemoryCache.set(key, {
        status: 'LOCKED',
        body: null,
        expires: Date.now() + 10000,
      });
      return true;
    }
  }

  private async writeCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        // Fallback silently to memory
      }
    }

    this.localMemoryCache.set(key, {
      status: value.status,
      body: value.body,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  private async deleteCache(key: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        // Fallback silently
      }
    }

    // Release horizontal advisory lock (PostgreSQL)
    try {
      await this.prisma.$queryRawUnsafe(
        `SELECT pg_advisory_unlock(hashtext($1));`,
        key,
      );
    } catch (err) {
      this.logger.error('Failed to release Postgres Advisory Lock:', err);
    }
    this.localMemoryCache.delete(key);
  }
}
