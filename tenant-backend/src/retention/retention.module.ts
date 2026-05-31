import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';

import { PrismaService } from '../prisma.service';

@Module({
  providers: [RetentionService, PrismaService],
})
export class RetentionModule {}
