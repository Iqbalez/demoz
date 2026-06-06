import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { RolesService } from '../settings/roles.service';
import { Permission } from '../common/permissions/permissions';

/**
 * PermissionsGuard — granular permission checking.
 * 
 * Works alongside the existing RolesGuard. RolesGuard checks broad role-level
 * access (OWNER, HR, EMPLOYEE). PermissionsGuard checks fine-grained permissions
 * resolved from either the user's custom role or their enum role defaults.
 * 
 * Resolution is Redis-cached (5 min TTL) via RolesService.resolvePermissions().
 * The JWT only carries userId + tenantId + userRole enum — permissions are NOT
 * embedded in the token since custom roles are mutable.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @RequirePermissions() decorator, allow through (RolesGuard may still block)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id || !user?.tenantId) {
      throw new ForbiddenException('Access Denied: Missing authentication context.');
    }

    const userPermissions = await this.rolesService.resolvePermissions(user.id, user.tenantId);

    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Access Denied: Insufficient permissions.');
    }

    return true;
  }
}
