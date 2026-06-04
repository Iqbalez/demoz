import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaService } from '../prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { LeaveLiabilityService } from '../hr/reports/leave-liability.service';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, PrismaService, DashboardService, LeaveLiabilityService],
  exports: [LeaveService],
})
export class LeaveModule {}
