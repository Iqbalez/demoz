import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { withoutTenantIsolation } from '../tenant-context';

/**
 * Centralized audit logging service.
 * Writes structured entries to the AuditLog table with tenant + user context.
 *
 * Usage:
 *   await this.audit.log(tenantId, userId, 'updated_company_settings', { field: 'name', oldValue, newValue });
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an audit log entry.
   *
   * @param tenantId  The tenant scope for the action
   * @param userId    The user who performed the action
   * @param action    A machine-readable action identifier (e.g., 'updated_payroll_settings')
   * @param metadata  Optional JSON payload with change details
   */
  async log(
    tenantId: string,
    userId: string,
    action: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await withoutTenantIsolation(() =>
        this.prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action,
            metadata,
          },
        }),
      );
    } catch (error) {
      // Audit logging should NEVER block business operations.
      // Log the failure and continue.
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
        { tenantId, userId, action },
      );
    }
  }

  /**
   * Retrieves paginated audit logs for a tenant.
   */
  async getAuditLogs(
    tenantId: string,
    options: { page?: number; limit?: number; action?: string } = {},
  ) {
    const { page = 1, limit = 50, action } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
