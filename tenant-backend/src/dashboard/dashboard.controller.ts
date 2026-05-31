import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async getKpis(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.dashboardService.getTenantKPIs(tenantId);
  }
  @Get('audit-logs')
  @Roles(UserRole.HR, UserRole.OWNER, UserRole.SUPER_ADMIN)
  async getAuditLogs(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) return [];
    return this.dashboardService.getAuditLogs(tenantId);
  }
}
