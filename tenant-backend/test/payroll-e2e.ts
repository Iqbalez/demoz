import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { tenantStorage } from '../src/tenant-context';
import { PayrollController } from '../src/payroll/payroll.controller';
import { FinanceController } from '../src/finance/finance.controller';
import { AttendanceType, AttendanceSource, UserRole } from '@prisma/client';
import { authenticator } from 'otplib';
import * as fs from 'fs';
import * as path from 'path';

// Manual environment variable injector
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key.trim()] = val;
      }
    });
    console.log(`◇ Injected environment variables from ${envPath}`);
  }
}

async function runPayrollTests() {
  loadEnv();

  console.log('🚀 Bootstrapping Demoz Payroll Queue E2E Test Suite...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  const payrollController = app.get(PayrollController);
  const financeController = app.get(FinanceController);

  try {
    console.log('🧹 Cleaning up database tables...');
    await prisma.auditLog.deleteMany({});
    await prisma.aiAuditReport.deleteMany({});
    await prisma.payrollLineItem.deleteMany({});
    await prisma.payrollRun.deleteMany({});
    await prisma.attendanceLog.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.tenant.deleteMany({});

    console.log('🌱 Seeding fresh test corporate models...');
    
    // 1. Create subscriber Tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Ethio Telecom HQ',
        companyCode: 'ETHIO',
      },
    });

    const TEST_2FA_SECRET = authenticator.generateSecret();

    // 1A. Create Corporate Owner
    const owner = await prisma.user.create({
      data: {
        id: '55555555-5555-5555-5555-555555555555',
        tenantId: tenant.id,
        email: 'owner@ethiotelecom.com',
        passwordHash: 'hashed_password',
        phoneNumber: '+251933333333',
        role: UserRole.OWNER,
        twoFactorSecret: TEST_2FA_SECRET,
      },
    });

    // 2. Create Corporate Branch
    const branch = await prisma.branch.create({
      data: {
        id: '88888888-8888-8888-8888-888888888888',
        tenantId: tenant.id,
        name: 'Churchill Road Branch',
        latitude: 9.0222,
        longitude: 38.7424,
        geofenceRadiusMeters: 100,
      },
    });

    // 3. Create Department
    const department = await prisma.department.create({
      data: {
        id: '77777777-7777-7777-7777-777777777777',
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Infrastructure Operations',
      },
    });

    // 4. Create Employee 1: Abebe Bikila (Clean active record, basic salary 15,000 ETB)
    const abebe = await prisma.employee.create({
      data: {
        id: '11111111-0000-0000-0000-000000000000',
        tenantId: tenant.id,
        departmentId: department.id,
        firstName: 'Abebe',
        lastName: 'Bikila',
        employeeIdNumber: 'EMP-BEKELE',
        phoneNumber: '+251911111111',
        faydaNumber: '111111111111',
        baseSalary: 15000.00,
        paymentMethod: 'BANK',
        status: 'ACTIVE',
        hireDate: new Date('2024-01-01T00:00:00Z'),
      } as any,
    });

    // 5. Create Employee 2: Almaz Ayana (Anomalous record, basic salary 10,000 ETB)
    const almaz = await prisma.employee.create({
      data: {
        id: '22222222-0000-0000-0000-000000000000',
        tenantId: tenant.id,
        departmentId: department.id,
        firstName: 'Almaz',
        lastName: 'Ayana',
        employeeIdNumber: 'EMP-AYANA',
        phoneNumber: '+251922222222',
        faydaNumber: '222222222222',
        baseSalary: 10000.00,
        paymentMethod: 'BANK',
        status: 'ACTIVE',
        hireDate: new Date('2024-01-01T00:00:00Z'),
      } as any,
    });

    console.log('🌱 Seeding Suspicious Attendance Logs to trigger AI Audits...');

    const periodStartStr = '2026-05-01T00:00:00.000Z';
    const periodEndStr = '2026-05-30T00:00:00.000Z';

    // Abebe: Normal clean log entries
    await prisma.attendanceLog.create({
      data: {
        tenantId: tenant.id,
        employeeId: abebe.id,
        type: AttendanceType.CLOCK_IN,
        source: AttendanceSource.WEB_PWA,
        isAnomaly: false,
        timestamp: new Date('2026-05-15T08:00:00Z'),
      },
    });

    await prisma.attendanceLog.create({
      data: {
        tenantId: tenant.id,
        employeeId: abebe.id,
        type: AttendanceType.CLOCK_OUT,
        source: AttendanceSource.WEB_PWA,
        isAnomaly: false,
        timestamp: new Date('2026-05-15T17:00:00Z'),
      },
    });

    // Almaz: Suspicious repeated geofence anomaly breaches (buddy-punching indicators)
    await prisma.attendanceLog.create({
      data: {
        tenantId: tenant.id,
        employeeId: almaz.id,
        type: AttendanceType.CLOCK_IN,
        source: AttendanceSource.WEB_PWA,
        isAnomaly: true,
        anomalyReason: 'Geofence Breach: Worker was 450 meters away',
        timestamp: new Date('2026-05-15T08:05:00Z'),
      },
    });

    await prisma.attendanceLog.create({
      data: {
        tenantId: tenant.id,
        employeeId: almaz.id,
        type: AttendanceType.CLOCK_OUT,
        source: AttendanceSource.WEB_PWA,
        isAnomaly: true,
        anomalyReason: 'Geofence Breach: Worker was 620 meters away',
        timestamp: new Date('2026-05-15T17:10:00Z'),
      },
    });

    console.log('🚀 Seeding complete. Triggering Non-Blocking Payroll Controller...');

    // 6. Call the trigger payroll run controller method within the active tenant context
    const initialResponse = await tenantStorage.run(tenant.id, async () => {
      return await payrollController.triggerPayrollRun({
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
      });
    });

    console.log('✔ Non-Blocking Controller responded immediately!');
    console.log('Response Payload:', JSON.stringify(initialResponse, null, 2));

    if (!initialResponse.payrollRunId || initialResponse.status !== 'PROCESSING') {
      throw new Error('Controller failed to return immediate 202 Accepted status and runId.');
    }

    // 7. Poll the status endpoint asynchronously until completed
    console.log('\n⏳ Waiting for Redis and BullMQ background processor to complete calculations...');
    let payrollRun: any = null;
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling status (Attempt ${attempt}/${maxAttempts})...`);
      
      payrollRun = await tenantStorage.run(tenant.id, async () => {
        return await payrollController.getPayrollRunStatus(initialResponse.payrollRunId);
      });

      if (payrollRun.status === 'COMPLETED' || payrollRun.status === 'FAILED') {
        break;
      }
      await new Promise(r => setTimeout(r, 1000)); // wait 1s
    }

    console.log('\n🏁 Background processing finished!');
    console.log('Final PayrollRun Status:', payrollRun.status);

    if (payrollRun.status !== 'COMPLETED') {
      throw new Error(`Background job failed! Error: ${payrollRun.errorMessage}`);
    }

    // -------------------------------------------------------------------------
    // ASSERTION 1: AI Compliance Audit Reporting
    // -------------------------------------------------------------------------
    console.log('\n🛡 Verifying AI Compliance Audit Report...');
    const report = payrollRun.aiAuditReport;
    if (!report) {
      throw new Error('AI Audit Report was not committed to the database!');
    }

    console.log('Risk Score:', report.fraudRiskScore);
    console.log('Flagged Employees:', JSON.stringify(report.flaggedEmployeeIds));
    console.log('Insights Summary:', report.insightsSummary);

    if (report.totalLogsAnalyzed !== 4) {
      throw new Error(`AI Audit logged incorrect analysis footprint. Expected 4 logs, got ${report.totalLogsAnalyzed}`);
    }

    const flagged = report.flaggedEmployeeIds as string[];
    if (!flagged.includes(almaz.id)) {
      throw new Error('AI Audit failed to flag Almaz for duplicate geofence radius breaches!');
    }
    if (flagged.includes(abebe.id)) {
      throw new Error('AI Audit falsely flagged clean employee Abebe!');
    }
    console.log('✔ AI compliance auditing and anomaly scoring verified successfully!');

    // -------------------------------------------------------------------------
    // ASSERTION 2: Low-RAM Cursor Isolation & Compliance Block
    // -------------------------------------------------------------------------
    console.log('\n🔒 Verifying Low-RAM Batch Streaming & Safety Block...');
    const lineItems = payrollRun.payrollLineItems;

    // Almaz should be blocked/skipped, meaning we only have Abebe's line item!
    if (lineItems.length !== 1) {
      throw new Error(`Expected exactly 1 line item, got ${lineItems.length}. Safety block failed!`);
    }

    const item = lineItems[0];
    if (item.employeeId !== abebe.id) {
      throw new Error('Committed line item is for the incorrect employee!');
    }
    console.log('✔ AI compliance blocker successfully skipped processing for suspicious employee!');

    // -------------------------------------------------------------------------
    // ASSERTION 3: Ethiopian Statutory Tax & Pension compliance
    // -------------------------------------------------------------------------
    console.log('\n🧮 Verifying Compliant Ethiopian Income Tax (Schedule A) & Pension...');

    const baseVal = Number(item.baseSalary);
    const pensionVal = Number(item.pensionDeduction);
    const taxVal = Number(item.incomeTax);
    const netVal = Number(item.netPay);

    console.log('Basic Salary:', baseVal, 'ETB');
    console.log('7% POESSA Private Pension:', pensionVal, 'ETB');
    console.log('Taxable Income:', baseVal - pensionVal, 'ETB');
    console.log('Employment Income Tax (ERCA):', taxVal, 'ETB');
    console.log('Net Salary Disbursed:', netVal, 'ETB');

    // Expected calculations:
    // Base = 15,000
    // Pension = 15,000 * 0.07 = 1,050
    // Taxable Income = 15,000 - 1,050 = 13,950
    // Bracket (10,001 - 14,000) -> 30% rate, 1,350 deductible
    // Tax = 13,950 * 0.30 - 1,350 = 4,185 - 1,350 = 2,835
    // Net Pay = 15,000 - 1,050 - 2,835 = 11,115
    const expectedPension = 1050.00;
    const expectedTax = 2835.00;
    const expectedNet = 11115.00;

    if (pensionVal !== expectedPension) {
      throw new Error(`Invalid pension calculation! Expected ${expectedPension}, got ${pensionVal}`);
    }
    if (taxVal !== expectedTax) {
      throw new Error(`Invalid Schedule A Income Tax calculation! Expected ${expectedTax}, got ${taxVal}`);
    }
    if (netVal !== expectedNet) {
      throw new Error(`Invalid Net Pay calculation! Expected ${expectedNet}, got ${netVal}`);
    }

    console.log('✔ Compliant Ethiopian Statutory Deductions verified successfully!');

    // -------------------------------------------------------------------------
    // ASSERTION 4: Maker-Checker 2FA Financial Security & Chapa Payouts
    // -------------------------------------------------------------------------
    console.log('\n🔐 Verifying Maker-Checker 2FA Financial Gatekeeper...');
    
    const mockReq = {
      user: { userId: owner.id, tenantId: tenant.id },
      ip: '192.168.1.100',
      headers: { 'user-agent': 'E2E-Automated-Test' },
    };

    // 4A. Attempt to bypass with invalid TOTP token
    try {
      await tenantStorage.run(tenant.id, async () => {
        await financeController.approvePayroll(payrollRun.id, '000000', mockReq);
      });
      throw new Error('Security Breach! Allowed invalid 2FA token to execute payroll.');
    } catch (e: any) {
      if (e.status !== 403) {
        throw new Error(`Expected 403 Forbidden, got ${e.status}: ${e.message}`);
      }
      console.log('✔ Correctly blocked invalid 2FA TOTP token with 403 Forbidden.');
    }

    // 4B. Execute with valid mathematical TOTP token
    const validToken = authenticator.generate(TEST_2FA_SECRET);
    console.log(`Generated valid TOTP Token: ${validToken}`);
    
    const approveResult = await tenantStorage.run(tenant.id, async () => {
      return await financeController.approvePayroll(payrollRun.id, validToken, mockReq);
    });

    if (!approveResult.success) {
      throw new Error('Valid 2FA TOTP token failed to approve payroll.');
    }
    console.log('✔ 2FA Maker-Checker mathematically validated and payroll approved!');

    // 4C. Verify Immutable AuditLog was recorded
    const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant.id } });
    if (auditLogs.length === 0 || auditLogs[0].action !== 'PAYROLL_APPROVED_AND_DISBURSED') {
      throw new Error('Immutable AuditLog was not securely persisted!');
    }
    console.log('✔ Immutable AuditLog permanently recorded owner execution.');

    // 4D. Poll for Chapa Bulk Disbursement Background Completion
    console.log('\n⏳ Waiting for background Chapa batch engine to simulate network chunks...');
    let chapaRunStatus = '';
    for (let attempt = 1; attempt <= 15; attempt++) {
      const runCheck = await prisma.payrollRun.findUnique({ where: { id: payrollRun.id } });
      if (runCheck?.status === 'PAID' || runCheck?.status === 'PAYOUT_FAILED') {
        chapaRunStatus = runCheck.status;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (chapaRunStatus !== 'PAID') {
      throw new Error(`Chapa disbursement failed to complete. Final status: ${chapaRunStatus}`);
    }
    
    // Check if line item was marked as SUCCESS
    const finalItem = await prisma.payrollLineItem.findUnique({ where: { id: item.id } });
    if (finalItem?.payoutStatus !== 'SUCCESS' || !finalItem.chapaReference) {
      throw new Error('Chapa batch webhook failed to apply SUCCESS status and reference ID to line item.');
    }
    console.log(`✔ Chapa API simulated perfectly! Assigned ID: ${finalItem.chapaReference}`);

    console.log('\n🌟 ALL ASYNCHRONOUS PAYROLL & AI COMPLIANCE ENGINE E2E TESTS PASSED! 🌟');

  } catch (error) {
    console.error('\n❌ Payroll E2E Integration Suite Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPayrollTests();
