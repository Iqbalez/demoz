import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayrollController } from './payroll.controller';
import { PayrollProcessor } from './payroll.processor';
import { AiAuditService } from './ai-audit.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payroll-queue',
    }),
  ],
  controllers: [PayrollController],
  providers: [PayrollProcessor, AiAuditService, PrismaService],
  exports: [AiAuditService],
})
export class PayrollModule {}
