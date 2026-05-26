import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redisUrl = process.env.UPSTASH_REDIS_URL;
        if (!redisUrl) {
          throw new Error('UPSTASH_REDIS_URL is not defined. Check your .env file.');
        }
        
        const client = new Redis(redisUrl);
        
        client.on('error', (err) => {
          console.error('[Redis] connection error:', err);
        });
        
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
