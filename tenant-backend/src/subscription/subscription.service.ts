import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { TenantStatus, EmployeeStatus, UserRole } from '@prisma/client';
import { env } from '../config/env';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 5th-of-the-month Compliance Reminder
   * Reminds HR and Owners that ERCA and POESSA reports are due.
   */
  @Cron('0 0 5 * *')
  async remindComplianceReports() {
    this.logger.log('Executing 5th-of-month ERCA & POESSA compliance reminder...');
    const tenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      include: {
        users: {
          where: { role: { in: [UserRole.OWNER, UserRole.HR] } },
          select: { email: true },
        },
      },
    });

    for (const tenant of tenants) {
      if (!tenant.users || tenant.users.length === 0) continue;
      const emails = tenant.users.map((u) => u.email).join(', ');
      this.logger.log(`[Email Mock] To: ${emails} | Subject: Compliance Reports Due | Body: Your ERCA and POESSA monthly reports are due. Please download them from the dashboard and submit.`);
    }
  }

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

    // 3. Generate renewal invoices for tenants expiring in the next 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringTenants = await this.prisma.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        subscriptionExpiresAt: {
          gt: now,
          lte: threeDaysFromNow,
        },
      },
    });

    let generatedInvoicesCount = 0;

    for (const tenant of expiringTenants) {
      if (tenant.planTier === 'FREE') continue;

      // Check if an unpaid invoice already covers the next period (approx 30 days out)
      const existingInvoice = await this.prisma.subscriptionInvoice.findFirst({
        where: {
          tenantId: tenant.id,
          isPaid: false,
          billingPeriodEnd: {
            gt: tenant.subscriptionExpiresAt || now,
          },
        },
      });

      if (existingInvoice) continue;

      // Calculate price based on plan tier
      let price = 3000;
      if (tenant.planTier === 'GROWTH') price = 5000;
      else if (tenant.planTier === 'ENTERPRISE') price = 10000;

      const expiry = tenant.subscriptionExpiresAt || now;
      const billingPeriodStart = expiry;
      const billingPeriodEnd = new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Create new unpaid SubscriptionInvoice
      const invoice = await this.prisma.subscriptionInvoice.create({
        data: {
          tenantId: tenant.id,
          amount: price,
          currency: 'ETB',
          billingPeriodStart,
          billingPeriodEnd,
          isPaid: false,
        },
      });

      const txRef = `sub_renewal_${invoice.id}_${Date.now()}`;
      const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_KEY';
      let checkoutUrl = `${env.FRONTEND_URL}/dashboard/billing?payment_success=true&ref=${txRef}`;

      if (CHAPA_SECRET_KEY !== 'CHASECK_TEST_KEY') {
        try {
          const ownerUser = await this.prisma.user.findFirst({
            where: { tenantId: tenant.id, role: 'OWNER' },
          });

          const chapaRes = await fetch('https://api.chapa.co/v1/transaction/initialize', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              amount: price.toString(),
              currency: 'ETB',
              email: ownerUser?.email || 'admin@demoz.com',
              first_name: tenant.name,
              last_name: 'Workspace Owner',
              phone: ownerUser?.phoneNumber || '0900000000',
              tx_ref: txRef,
              callback_url: `${env.BACKEND_URL}/subscription/webhook`,
              return_url: `${env.FRONTEND_URL}/dashboard/billing?payment_success=true&ref=${txRef}`,
            }),
          });

          const data = await chapaRes.json();
          if (chapaRes.ok && data?.status === 'success') {
            checkoutUrl = data.data.checkout_url;
          }
        } catch (err: any) {
          this.logger.error(`Chapa initialization failed for renewal of tenant ${tenant.id}: ${err.message}`);
        }
      }

      // Store references as a serialized JSON string in chapaPaymentReference column
      const serializedRef = JSON.stringify({ txRef, checkoutUrl });
      await this.prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { chapaPaymentReference: serializedRef },
      });

      generatedInvoicesCount++;
      this.logger.log(`Generated renewal invoice for Tenant ${tenant.name} (${tenant.id}), price: ${price} ETB`);
    }

    this.logger.log(`Nightly billing monitor completed. Expired: ${expiredTenants.length}, Suspended: ${gracePeriodExpiredTenants.length}, Renewals generated: ${generatedInvoicesCount}`);
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
