import { Injectable, CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantStatus } from '@prisma/client';

@Injectable()
export class TenantLifecycleGuard implements CanActivate {
  // Ultra-fast in-memory map to prevent hammering the DB on every single web API request
  private statusCache: Map<string, { status: TenantStatus; expires: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1-minute time-to-live

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1. Bypass check if it's a USSD Webhook.
    // Telecom USSD relies on phone number verification rather than JWT tenant headers.
    // The UssdService directly intercepts and halts Suspended corporate accounts returning plain text.
    if (
      (req.originalUrl && req.originalUrl.includes('/ussd')) ||
      (req.url && req.url.includes('/ussd')) ||
      (req.path && req.path.includes('/ussd'))
    ) {
      return true;
    }

    // 2. Standard Web Requests
    const user = req.user;
    if (!user || !user.tenantId) {
      return true; // Pass through if there's no JWT (handled by Public decorators if applicable)
    }

    const tenantId = user.tenantId;
    let status = this.getCachedStatus(tenantId);

    if (!status) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true },
      });

      if (!tenant) {
        throw new ForbiddenException('Tenant context invalid or not found.');
      }
      status = tenant.status;
      this.setCachedStatus(tenantId, status);
    }

    // 3. Execution Gates
    if (status === TenantStatus.ACTIVE) {
      return true;
    }

    if (status === TenantStatus.PAST_DUE) {
      // Allow Read-Only GET endpoints so HR can still export data
      if (req.method === 'GET') {
        return true;
      }
      // Exclude dedicated billing payment routes from the lock
      if (req.path.includes('/billing')) {
        return true;
      }
      // Hard block on standard POST, PUT, DELETE
      throw new ForbiddenException({
        errorCode: 'TENANT_PAST_DUE',
        message: 'Your workspace is PAST DUE. Please resolve your billing to create or update records.',
      });
    }

    if (status === TenantStatus.SUSPENDED) {
      throw new HttpException(
        {
          errorCode: 'TENANT_SUSPENDED',
          message: 'Your corporate workspace is deactivated due to an outstanding invoice. Please clear balance.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private getCachedStatus(tenantId: string): TenantStatus | null {
    const cached = this.statusCache.get(tenantId);
    if (cached && cached.expires > Date.now()) {
      return cached.status;
    }
    return null;
  }

  private setCachedStatus(tenantId: string, status: TenantStatus) {
    this.statusCache.set(tenantId, {
      status,
      expires: Date.now() + this.CACHE_TTL_MS,
    });
  }
}
