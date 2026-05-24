import { SetMetadata } from '@nestjs/common';

export const RateLimit = (limit: number, windowMs: number = 60000) => {
  return (target: any, key: string | symbol, descriptor: any) => {
    SetMetadata('rateLimit', limit)(target, key, descriptor);
    SetMetadata('rateLimitWindow', windowMs)(target, key, descriptor);
  };
};
