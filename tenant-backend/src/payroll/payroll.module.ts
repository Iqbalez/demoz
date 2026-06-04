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
import { PayrollDisburseService } from './payroll-disburse.service';
import { PayrollDisburseProcessor } from './payroll-disburse.processor';
import { PayslipService } from './payslip.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ErcaReportService } from './reports/erca-report.service';
import { PoessaReportService } from './reports/poessa-report.service';
import { EthiopianCalendarService } from '../shared/ethiopian-calendar/ethiopian-calendar.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payroll-queue',
    }),
    BullModule.registerQueue({
      name: 'payroll-disburse',
    }),
    RealtimeModule,
  ],
  controllers: [PayrollController, ReportsController],
  providers: [
    PayrollProcessor,
    PayrollDisburseProcessor,
    AiAuditService,
    OvertimeService,
    PrismaService,
    DashboardService,
    PayrollCalculationService,
    PayrollDisburseService,
    PayslipService,
    ErcaReportService,
    PoessaReportService,
    EthiopianCalendarService,
  ],
  exports: [AiAuditService, OvertimeService, PayrollCalculationService, PayrollDisburseService, PayslipService],
})
export class PayrollModule {}
