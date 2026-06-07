import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles } from '../auth/roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { UserRole } from '@prisma/client';
import { tenantStorage } from '../tenant-context';
import { PERMISSIONS } from '../common/permissions/permissions';

export type SettingsModuleType = 'company' | 'security' | 'payroll' | 'attendance' | 'notifications' | 'integrations';

@Controller('settings')
@UseGuards(PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.VIEW_SETTINGS)
  async getSettings() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.getSettings(tenantId);
  }

  @Patch('company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updateCompany(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'company', payload, req.user?.userId);
  }

  @Patch('security')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updateSecurity(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'security', payload, req.user?.userId);
  }

  @Patch('payroll')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updatePayroll(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'payroll', payload, req.user?.userId);
  }

  @Patch('attendance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updateAttendance(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'attendance', payload, req.user?.userId);
  }

  @Get('notifications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.VIEW_SETTINGS)
  async getNotifications(@Req() req: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const userId = req.user?.userId;
    if (!userId) throw new BadRequestException('User context missing.');
    return this.settingsService.getNotificationSettings(tenantId, userId);
  }

  @Patch('notifications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updateNotifications(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'notifications', payload, req.user?.userId);
  }

  @Patch('notifications/me')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  async updateMyNotifications(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const userId = req.user?.userId;
    if (!userId) throw new BadRequestException('User context missing.');
    return this.settingsService.updateUserNotificationPreferences(tenantId, userId, payload);
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async exportCompanyData(@Req() req: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.exportCompanyData(tenantId);
  }

  @Patch('integrations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async updateIntegrations(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateSettings(tenantId, 'integrations', payload, req.user?.userId);
  }

  // --- Leave Policies CRUD ---
  @Get('leave-policies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.VIEW_SETTINGS)
  async getLeavePolicies() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.getLeavePolicies(tenantId);
  }

  @Post('leave-policies')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.EDIT_LEAVE_POLICY)
  async createLeavePolicy(@Req() req: any, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.createLeavePolicy(tenantId, payload, req.user?.userId);
  }

  @Patch('leave-policies/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.EDIT_LEAVE_POLICY)
  async updateLeavePolicy(@Req() req: any, @Param('id') id: string, @Body() payload: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.updateLeavePolicy(tenantId, id, payload, req.user?.userId);
  }

  @Delete('leave-policies/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.EDIT_LEAVE_POLICY)
  async deleteLeavePolicy(@Req() req: any, @Param('id') id: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.deleteLeavePolicy(tenantId, id, req.user?.userId);
  }

  // --- Company holidays ---
  @Get('holidays')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.VIEW_SETTINGS)
  async getHolidays(@Query('year') year?: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.settingsService.getTenantHolidays(tenantId, yearNum);
  }

  @Post('holidays')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async createHoliday(@Req() req: any, @Body() body: { date: string; name: string }) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.createTenantHoliday(tenantId, body, req.user?.userId);
  }

  @Delete('holidays/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @RequirePermissions(PERMISSIONS.MANAGE_SETTINGS)
  async deleteHoliday(@Req() req: any, @Param('id') id: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.settingsService.deleteTenantHoliday(tenantId, id, req.user?.userId);
  }

  // --- Audit Logs ---
  @Get('audit-logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.VIEW_AUDIT_LOG)
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.settingsService.getAuditLogs(tenantId, pageNum, limitNum);
  }
}
