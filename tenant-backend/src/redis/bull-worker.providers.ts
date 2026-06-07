import type { Type } from '@nestjs/common';
import { isBullWorkersEnabled } from './redis.config';

/** Register BullMQ Worker processors only when explicitly enabled (saves Upstash quota). */
export function bullWorkerProviders(...processors: Type<unknown>[]): Type<unknown>[] {
  return isBullWorkersEnabled() ? processors : [];
}
