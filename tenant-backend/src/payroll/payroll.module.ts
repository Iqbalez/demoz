import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayrollController } from './payroll.controller';
import { PayrollProcessor } from './payroll.processor';
import { AiAuditService } from './ai-audit.service';
import { OvertimeService } from './overtime.service';
import { PrismaService } from '../prisma.service';
import { ReportsController } from './reports.controller';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { DashboardService } from '../dashboard/dashboard.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payroll-queue',
    }),
  ],
  controllers: [PayrollController, ReportsController],
  providers: [
    PayrollProcessor,
    AiAuditService,
    OvertimeService,
    PrismaService,
    DashboardService,
    PayrollCalculationService,
  ],
  exports: [AiAuditService, OvertimeService, PayrollCalculationService],
})
export class PayrollModule {}

