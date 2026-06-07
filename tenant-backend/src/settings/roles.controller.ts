import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Roles } from '../auth/roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { UserRole } from '@prisma/client';
import { tenantStorage } from '../tenant-context';
import { PERMISSIONS } from '../common/permissions/permissions';

@Controller('settings/roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_ROLES)
  async listRoles() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.rolesService.listRoles(tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_ROLES)
  async createRole(
    @Body() body: { name: string; description?: string; permissions: string[] },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.rolesService.createRole(tenantId, body);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_ROLES)
  async updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; permissions?: string[] },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.rolesService.updateRole(tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_ROLES)
  async deleteRole(@Param('id') id: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.rolesService.deleteRole(tenantId, id);
  }

  @Patch('users/:userId/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  @RequirePermissions(PERMISSIONS.MANAGE_ROLES)
  async assignUserRole(
    @Param('userId') userId: string,
    @Body() body: { customRoleId?: string | null; role?: string },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.rolesService.assignUserRole(tenantId, userId, body);
  }
}
