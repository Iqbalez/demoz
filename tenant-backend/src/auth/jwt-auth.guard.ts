import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from './public.decorator';
import { tenantStorage, withoutTenantIsolation } from '../tenant-context';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (
      (req.originalUrl && req.originalUrl.includes('/ussd')) ||
      (req.url && req.url.includes('/ussd')) ||
      (req.path && req.path.includes('/ussd'))
    ) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isValid = await super.canActivate(context);
    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by jwt.strategy

    if (!user?.userId) {
      throw new UnauthorizedException('Token validation failed.');
    }

    // Check if user is SUPER_ADMIN first globally
    const dbUser = await withoutTenantIsolation(() =>
      this.prisma.user.findUnique({
        where: { id: user.userId },
      }),
    );

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('User account is invalid or suspended.');
    }

    // If super admin, bypass
    if (dbUser.role === UserRole.SUPER_ADMIN) {
      request.user.role = UserRole.SUPER_ADMIN;
      return true;
    }

    const requireTenant = this.reflector.getAllAndOverride<boolean>('requireTenant', [
      context.getHandler(),
      context.getClass(),
    ]);

    const tenantIdHeader = request.headers['x-tenant-id'];

    if (requireTenant && !tenantIdHeader) {
      throw new UnauthorizedException('Missing X-Tenant-ID header. This endpoint requires an active workspace.');
    }

    if (tenantIdHeader) {
      if (dbUser.tenantId !== tenantIdHeader) {
        throw new UnauthorizedException('Access Denied. You do not belong to the requested workspace.');
      }

      // Attach current role and tenant context to request
      request.user.role = dbUser.role;
      request.user.tenantId = dbUser.tenantId;

      // Activate Prisma RLS Context
      tenantStorage.enterWith(dbUser.tenantId!);
    } else {
      // If no tenant header is provided and it's not required, proceed with global user context
      request.user.role = null;
      request.user.tenantId = null;
    }
    
    return true;
  }
}
