import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
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
}
