import { TenantStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
}

import { PrismaService } from '../src/prisma.service';
import { SubscriptionService } from '../src/subscription/subscription.service';

async function testSubscriptionFlow() {
  console.log('--- Starting Subscription Renewal Flow Test ---');
  const prisma = new PrismaService();
  const subscriptionService = new SubscriptionService(prisma);

  try {
    // 1. Find or create a test tenant
    let tenant = await prisma.tenant.findFirst({
      where: { name: 'qali' },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'qali',
          companyCode: 'COMP_QALI_TEST',
          status: TenantStatus.ACTIVE,
          planTier: 'GROWTH',
          maxEmployees: 50,
          subscriptionExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Expires in 2 days (within warning window)
        },
      });
      console.log('Created test tenant:', tenant.name);
    } else {
      // Reset tenant to active expiring in 2 days
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          status: TenantStatus.ACTIVE,
          planTier: 'GROWTH',
          subscriptionExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      });
      console.log('Reset existing test tenant:', tenant.name);
    }

    // 2. Clear old unpaid invoices for this tenant
    await prisma.subscriptionInvoice.deleteMany({
      where: { tenantId: tenant.id, isPaid: false },
    });

    // 3. Trigger the cron billing run programmatically
    console.log('Running monitorBillingExpirations()...');
    await subscriptionService.monitorBillingExpirations();

    // 4. Verify that an unpaid invoice was generated
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: { tenantId: tenant.id, isPaid: false },
    });

    if (!invoice) {
      throw new Error('Verification Failed: No unpaid subscription invoice was generated for expiring tenant.');
    }

    console.log('Success: Unpaid invoice generated correctly.');
    console.log('Invoice details:', {
      id: invoice.id,
      amount: invoice.amount.toString(),
      periodStart: invoice.billingPeriodStart,
      periodEnd: invoice.billingPeriodEnd,
      ref: invoice.chapaPaymentReference,
    });

    // Verify ref contains serialized checkout url
    const parsedRef = JSON.parse(invoice.chapaPaymentReference || '{}');
    if (!parsedRef.txRef || !parsedRef.checkoutUrl) {
      throw new Error('Verification Failed: chapaPaymentReference does not contain valid serialized JSON metadata.');
    }
    console.log('Success: chapaPaymentReference contains valid JSON metadata:', parsedRef);

    // 5. Simulate Webhook payment confirmation call
    console.log('Simulating webhook payment confirmation for renewal reference:', parsedRef.txRef);
    
    const invoiceId = parsedRef.txRef.split('_')[2];
    const updatedInvoice = await prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { isPaid: true },
      include: { tenant: true },
    });

    const baseDate = updatedInvoice.tenant.subscriptionExpiresAt!.getTime() > Date.now()
      ? updatedInvoice.tenant.subscriptionExpiresAt!.getTime()
      : Date.now();

    const updatedTenant = await prisma.tenant.update({
      where: { id: updatedInvoice.tenantId },
      data: {
        status: TenantStatus.ACTIVE,
        subscriptionExpiresAt: new Date(baseDate + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('Renewal payment successfully cleared.');
    console.log('Updated Tenant details:', {
      id: updatedTenant.id,
      status: updatedTenant.status,
      newExpiresAt: updatedTenant.subscriptionExpiresAt,
    });

    const diffDays = Math.ceil((updatedTenant.subscriptionExpiresAt!.getTime() - tenant.subscriptionExpiresAt!.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 30) {
      throw new Error(`Verification Failed: Expiry date was not extended by exactly 30 days (extended by ${diffDays} days).`);
    }

    console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
  } catch (err: any) {
    console.error('Test Failed with Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionFlow();
