import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { TenantStatus, EmployeeStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automated Nightly Billing Engine
   * Executes mathematically every day at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async monitorBillingExpirations() {
    this.logger.log('Starting nightly billing and tenant lifecycle monitor...');
    const now = new Date();

    // 1. Shift expired active tenants to PAST_DUE
    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        subscriptionExpiresAt: { lt: now },
      },
    });

    for (const tenant of expiredTenants) {
      this.logger.warn(`Tenant ${tenant.id} (${tenant.name}) subscription expired. Shifting to PAST_DUE.`);
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.PAST_DUE },
      });
    }

    // 2. Suspend tenants that missed the 7-day PAST_DUE grace period
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const gracePeriodExpiredTenants = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.PAST_DUE,
        subscriptionExpiresAt: { lt: sevenDaysAgo },
      },
    });

    for (const tenant of gracePeriodExpiredTenants) {
      this.logger.error(`Tenant ${tenant.id} (${tenant.name}) completely violated grace period. Shifting to SUSPENDED.`);
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: TenantStatus.SUSPENDED },
      });
    }

    this.logger.log(`Nightly billing monitor completed. Shifted ${expiredTenants.length} to PAST_DUE, suspended ${gracePeriodExpiredTenants.length}.`);
  }

  /**
   * Mathematically evaluates whether the tenant possesses available software seats.
   * Prevents system abuse by hard-blocking excessive onboarding.
   */
  async verifySeatCapacity(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxEmployees: true },
    });

    if (!tenant) return false;

    const activeEmployeeCount = await this.prisma.employee.count({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
      },
    });

    return activeEmployeeCount < tenant.maxEmployees;
  }
}
