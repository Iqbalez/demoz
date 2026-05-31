import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { tenantStorage } from '../tenant-context';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from '../leave/leave.service';

@Controller()
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly leaveService: LeaveService,
  ) {}

  @Get('workspace/bootstrap')
  @Roles(UserRole.HR, UserRole.OWNER)
  async bootstrap() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const workspace = await this.workspaceService.ensureDefaultWorkspace(tenantId);
    await this.leaveService.seedDefaultLeaveTypes(tenantId);
    return workspace;
  }

  @Get('workspace/profile')
  @Roles(UserRole.HR, UserRole.OWNER)
  async getProfile() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.workspaceService.getTenantProfile(tenantId);
  }

  @Patch('workspace/profile')
  @Roles(UserRole.OWNER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateProfile(
    @Body() body: { name?: string; tin?: string },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.workspaceService.updateTenantProfile(tenantId, body);
  }

  @Get('workspace/team')
  @Roles(UserRole.HR, UserRole.OWNER)
  async getTeamMembers() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.workspaceService.getTeamMembers(tenantId);
  }

  @Get('branches')
  @Roles(UserRole.HR, UserRole.OWNER, UserRole.EMPLOYEE)
  async listBranches() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const branches = await this.workspaceService.listBranches(tenantId);
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      location: b.location ?? '',
      latitude: b.latitude != null ? Number(b.latitude) : 9.005401,
      longitude: b.longitude != null ? Number(b.longitude) : 38.763611,
      geofenceRadiusMeters: b.geofenceRadiusMeters,
    }));
  }

  @Post('branches')
  @Roles(UserRole.HR, UserRole.OWNER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createBranch(
    @Body()
    body: {
      name: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadiusMeters?: number;
    },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    const branch = await this.workspaceService.createBranch(tenantId, body);
    return {
      id: branch.id,
      name: branch.name,
      location: branch.location ?? '',
      latitude: branch.latitude != null ? Number(branch.latitude) : 9.005401,
      longitude: branch.longitude != null ? Number(branch.longitude) : 38.763611,
      geofenceRadiusMeters: branch.geofenceRadiusMeters,
    };
  }

  @Patch('branches/:id')
  @Roles(UserRole.HR, UserRole.OWNER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateBranch(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadiusMeters?: number;
    },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.workspaceService.updateBranch(tenantId, id, body);
  }

  @Delete('branches/:id')
  @Roles(UserRole.HR, UserRole.OWNER)
  async deleteBranch(@Param('id') id: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Tenant context missing.');
    return this.workspaceService.deleteBranch(tenantId, id);
  }
}
