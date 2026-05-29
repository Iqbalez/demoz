import { Injectable } from '@nestjs/common';
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
}
