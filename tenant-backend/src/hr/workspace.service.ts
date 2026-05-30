import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Ensures every tenant has a branch + department for mobile clock-in and HR onboarding. */
@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

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

  async resolveDepartmentId(tenantId: string, departmentId?: string, departmentName?: string) {
    if (departmentId) {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, tenantId },
      });
      if (existing) return existing.id;
    }

    const { branch, department } = await this.ensureDefaultWorkspace(tenantId);

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

    return department.id;
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
}
