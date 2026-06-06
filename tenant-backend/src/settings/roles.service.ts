import { Injectable, BadRequestException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DEFAULT_ROLE_PERMISSIONS, Permission } from '../common/permissions/permissions';
import Redis from 'ioredis';

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  /**
   * Unified permission resolver.
   * Priority: customRoleId permissions > UserRole enum defaults.
   */
  async resolvePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${tenantId}:${userId}`;

    // 1. Try cache
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. DB lookup
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        customRoleId: true,
        customRole: {
          select: {
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    });

    if (!user) return [];

    let permissions: Permission[];

    if (user.customRoleId && user.customRole) {
      // Custom role takes precedence
      permissions = user.customRole.permissions.map(p => p.permission as Permission);
    } else {
      // Fall back to static enum defaults
      permissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    }

    // 3. Cache result
    await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', CACHE_TTL).catch(() => {});

    return permissions;
  }

  /**
   * Invalidate permission cache for a specific user, or all users of a role.
   */
  async invalidatePermissionCache(tenantId: string, userId?: string, roleId?: string) {
    if (userId) {
      await this.redis.del(`permissions:${tenantId}:${userId}`).catch(() => {});
      return;
    }

    if (roleId) {
      // Find all users assigned to this custom role and bust their caches
      const users = await this.prisma.user.findMany({
        where: { tenantId, customRoleId: roleId },
        select: { id: true },
      });
      const pipeline = this.redis.pipeline();
      for (const u of users) {
        pipeline.del(`permissions:${tenantId}:${u.id}`);
      }
      await pipeline.exec().catch(() => {});
    }
  }

  // ──── CRUD ────

  async listRoles(tenantId: string) {
    // System roles (derived from enum)
    const systemRoles = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, perms]) => ({
      id: `system_${name}`,
      name,
      description: `Built-in ${name} role`,
      isSystem: true,
      permissions: perms,
      userCount: 0, // filled below
    }));

    // Count users per system role
    const systemCounts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { tenantId },
      _count: true,
    });
    for (const sc of systemCounts) {
      const match = systemRoles.find(r => r.name === sc.role);
      if (match) match.userCount = sc._count;
    }

    // Custom roles
    const customRoles = await this.prisma.customRole.findMany({
      where: { tenantId },
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const customMapped = customRoles.map(cr => ({
      id: cr.id,
      name: cr.name,
      description: cr.description,
      isSystem: false,
      permissions: cr.permissions.map(p => p.permission),
      userCount: cr._count.users,
    }));

    return [...systemRoles, ...customMapped];
  }

  async createRole(tenantId: string, data: { name: string; description?: string; permissions: string[] }) {
    if (!data.name?.trim()) throw new BadRequestException('Role name is required.');

    const role = await this.prisma.customRole.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isSystem: false,
        permissions: {
          create: data.permissions.map(p => ({ permission: p })),
        },
      },
      include: {
        permissions: { select: { permission: true } },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: false,
      permissions: role.permissions.map(p => p.permission),
    };
  }

  async updateRole(tenantId: string, roleId: string, data: { name?: string; description?: string; permissions?: string[] }) {
    // Guard: reject system role IDs
    if (roleId.startsWith('system_')) {
      throw new ForbiddenException('System roles cannot be modified.');
    }

    const existing = await this.prisma.customRole.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!existing) throw new BadRequestException('Role not found.');

    // Update base fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    const role = await this.prisma.customRole.update({
      where: { id: roleId },
      data: updateData,
    });

    // Delta-sync permissions if provided
    if (data.permissions) {
      const existingPerms = await this.prisma.rolePermission.findMany({
        where: { roleId },
        select: { id: true, permission: true },
      });

      const incomingSet = new Set(data.permissions);
      const existingMap = new Map(existingPerms.map(p => [p.permission, p.id]));

      const toAdd = data.permissions.filter(p => !existingMap.has(p));
      const toRemoveIds = existingPerms.filter(p => !incomingSet.has(p.permission)).map(p => p.id);

      const ops = [];
      if (toRemoveIds.length > 0) {
        ops.push(this.prisma.rolePermission.deleteMany({ where: { id: { in: toRemoveIds } } }));
      }
      if (toAdd.length > 0) {
        ops.push(this.prisma.rolePermission.createMany({
          data: toAdd.map(p => ({ roleId, permission: p })),
        }));
      }

      if (ops.length > 0) {
        await this.prisma.$transaction(ops);
      }
    }

    // Invalidate cache for all users with this role
    await this.invalidatePermissionCache(tenantId, undefined, roleId);

    const updated = await this.prisma.customRole.findUnique({
      where: { id: roleId },
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return {
      id: updated!.id,
      name: updated!.name,
      description: updated!.description,
      isSystem: false,
      permissions: updated!.permissions.map(p => p.permission),
      userCount: updated!._count.users,
    };
  }

  async deleteRole(tenantId: string, roleId: string) {
    // Guard: reject system role IDs
    if (roleId.startsWith('system_')) {
      throw new ForbiddenException('System roles cannot be deleted.');
    }

    const existing = await this.prisma.customRole.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new BadRequestException('Role not found.');

    if (existing._count.users > 0) {
      throw new ConflictException(
        `Cannot delete this role because ${existing._count.users} user(s) are currently assigned to it. Reassign them first.`,
      );
    }

    // Hard delete (no soft delete to avoid permission resolution ambiguity)
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.customRole.delete({ where: { id: roleId } });

    return { message: 'Role deleted.' };
  }
}
