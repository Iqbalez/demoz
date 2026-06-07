import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { withoutTenantIsolation } from '../tenant-context';

/** Ensures every tenant has a branch + department for mobile clock-in and HR onboarding. */
@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantProfile(tenantId: string) {
    const tenant = await withoutTenantIsolation(() =>
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          companyCode: true,
          tin: true,
          planTier: true,
          maxEmployees: true,
          status: true,
          createdAt: true,
        },
      }),
    );
    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }

  async updateTenantProfile(
    tenantId: string,
    data: { name?: string; tin?: string },
  ) {
    const updateData: any = {};
    if (data.name?.trim()) updateData.name = data.name.trim();
    if (data.tin !== undefined) updateData.tin = data.tin?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update.');
    }

    const updated = await withoutTenantIsolation(() =>
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: updateData,
        select: {
          id: true,
          name: true,
          companyCode: true,
          tin: true,
          planTier: true,
          maxEmployees: true,
          status: true,
        },
      }),
    );
    return updated;
  }

  async getTeamMembers(tenantId: string) {
    // Fetch real users belonging to this tenant (direct tenantId FK)
    const users = await withoutTenantIsolation(() =>
      this.prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          customRole: { select: { id: true, name: true } },
        },
      }),
    );

    // Fetch pending invitations
    const invitations = await withoutTenantIsolation(() =>
      this.prisma.invitation.findMany({
        where: { tenantId, status: 'PENDING' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          customRole: { select: { id: true, name: true } },
        },
      }),
    );

    return {
      members: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.customRole?.name ?? u.role,
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        customRoleId: u.customRole?.id ?? null,
      })),
      pendingInvitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.customRole?.name ?? inv.role,
        status: 'PENDING_INVITE',
        expiresAt: inv.expiresAt,
        customRoleId: inv.customRole?.id ?? null,
      })),
    };
  }

  async ensureDefaultWorkspace(tenantId: string) {
    let branch = await this.prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (!branch) {
      branch = await this.prisma.branch.create({
        data: {
          tenantId,
          name: 'Head Office',
          location: 'Addis Ababa',
          latitude: 9.005401,
          longitude: 38.763611,
          geofenceRadiusMeters: 500,
        },
      });
    }

    let department = await this.prisma.department.findFirst({
      where: { tenantId, branchId: branch.id },
      orderBy: { createdAt: 'asc' },
    });

    if (!department) {
      department = await this.prisma.department.create({
        data: {
          tenantId,
          branchId: branch.id,
          name: 'General',
        },
      });
    }

    return { branch, department, branchId: branch.id, departmentId: department.id };
  }

  async resolveDepartmentId(
    tenantId: string,
    departmentId?: string,
    departmentName?: string,
    branchId?: string,
  ) {
    if (departmentId) {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, tenantId },
      });
      if (existing) return existing.id;
    }

    let branch;
    if (branchId) {
      branch = await this.prisma.branch.findFirst({ where: { id: branchId, tenantId } });
      if (!branch) throw new BadRequestException('Branch not found.');
    } else {
      const workspace = await this.ensureDefaultWorkspace(tenantId);
      branch = workspace.branch;
    }

    const defaultDept = await this.prisma.department.findFirst({
      where: { tenantId, branchId: branch.id },
      orderBy: { createdAt: 'asc' },
    });

    if (departmentName?.trim()) {
      const named = await this.prisma.department.findFirst({
        where: { tenantId, branchId: branch.id, name: departmentName.trim() },
      });
      if (named) return named.id;

      const created = await this.prisma.department.create({
        data: {
          tenantId,
          branchId: branch.id,
          name: departmentName.trim(),
        },
      });
      return created.id;
    }

    if (defaultDept) return defaultDept.id;

    const created = await this.prisma.department.create({
      data: { tenantId, branchId: branch.id, name: 'General' },
    });
    return created.id;
  }

  async listBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(
    tenantId: string,
    data: {
      name: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadiusMeters?: number;
    },
  ) {
    return this.prisma.branch.create({
      data: {
        tenantId,
        name: data.name,
        location: data.location ?? null,
        latitude: data.latitude ?? 9.005401,
        longitude: data.longitude ?? 38.763611,
        geofenceRadiusMeters: data.geofenceRadiusMeters ?? 100,
      },
    });
  }

  private formatBranch(branch: {
    id: string;
    name: string;
    location: string | null;
    latitude: unknown;
    longitude: unknown;
    geofenceRadiusMeters: number;
  }) {
    return {
      id: branch.id,
      name: branch.name,
      location: branch.location ?? '',
      latitude: branch.latitude != null ? Number(branch.latitude) : 9.005401,
      longitude: branch.longitude != null ? Number(branch.longitude) : 38.763611,
      geofenceRadiusMeters: branch.geofenceRadiusMeters,
    };
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    data: {
      name?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadiusMeters?: number;
    },
  ) {
    const existing = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Branch not found.');
    }

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        name: data.name?.trim() ?? undefined,
        location: data.location !== undefined ? data.location || null : undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        geofenceRadiusMeters: data.geofenceRadiusMeters ?? undefined,
      },
    });

    return this.formatBranch(updated);
  }

  async deleteBranch(tenantId: string, branchId: string) {
    const existing = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      include: {
        departments: {
          include: { _count: { select: { employees: true } } },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Branch not found.');
    }

    const branchCount = await this.prisma.branch.count({ where: { tenantId } });
    if (branchCount <= 1) {
      throw new BadRequestException('You must keep at least one branch for your workspace.');
    }

    const employeesOnBranch = existing.departments.reduce(
      (sum, d) => sum + d._count.employees,
      0,
    );
    if (employeesOnBranch > 0) {
      throw new BadRequestException(
        'Cannot remove this branch while employees are assigned to its departments. Reassign them first.',
      );
    }

    await this.prisma.branch.delete({ where: { id: branchId } });
    return { message: 'Branch removed.' };
  }

  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: {
        branch: { select: { name: true } },
        parent: { select: { name: true } },
        manager: { select: { firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(tenantId: string, data: { name: string; branchId: string; parentId?: string; managerId?: string }) {
    // verify branch exists and belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: data.branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found.');

    if (data.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: data.parentId, tenantId },
      });
      if (!parent) throw new NotFoundException('Parent department not found.');
    }

    if (data.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: { id: data.managerId, tenantId },
      });
      if (!manager) throw new NotFoundException('Manager (Employee) not found.');
    }

    const existing = await this.prisma.department.findFirst({
      where: { tenantId, branchId: data.branchId, name: data.name.trim() },
    });
    if (existing) throw new BadRequestException('Department with this name already exists in this branch.');

    return this.prisma.department.create({
      data: {
        tenantId,
        branchId: data.branchId,
        name: data.name.trim(),
        parentId: data.parentId || null,
        managerId: data.managerId || null,
      },
    });
  }

  async deleteDepartment(tenantId: string, departmentId: string) {
    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!existing) throw new NotFoundException('Department not found.');

    if (existing._count.employees > 0) {
      throw new BadRequestException('Cannot remove this department because there are employees assigned to it. Reassign them first.');
    }

    await this.prisma.department.delete({ where: { id: departmentId } });
    return { message: 'Department removed.' };
  }
}
