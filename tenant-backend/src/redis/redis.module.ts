import { Global, Module } from '@nestjs/common';
import { createRedisClient } from './redis.config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => createRedisClient(),
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
