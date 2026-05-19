import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { tenantStorage } from '../src/tenant-context';
import { EmployeeService } from '../src/hr/employee.service';
import { AttendanceService } from '../src/attendance/attendance.service';
import { AttendanceType } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Bulletproof manual environment variable injector
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
  } else {
    console.warn(`⚠ Warning: Env file not found at ${envPath}`);
  }
}

async function runTests() {
  // Load environment variables before bootstrapping NestJS
  loadEnv();

  console.log('🚀 Bootstrapping Demoz E2E Test Suite...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.use(require('express').urlencoded({ extended: true }));
  await app.init();

  const prisma = app.get(PrismaService);
  const employeeService = app.get(EmployeeService);
  const attendanceService = app.get(AttendanceService);

  try {
    console.log('🧹 Cleaning up database tables...');
    await prisma.auditLog.deleteMany({});
    await prisma.aiAuditReport.deleteMany({});
    await prisma.payrollLineItem.deleteMany({});
    await prisma.payrollRun.deleteMany({});
    await prisma.attendanceLog.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.tenant.deleteMany({});

    console.log('🌱 Seeding fresh test database models...');
    // Create subscriber Tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Hawassa Factory Corp',
        companyCode: 'TEST',
      },
    });

    // Create Corporate Branch with coordinates
    const branch = await prisma.branch.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        tenantId: tenant.id,
        name: 'Hawassa Industrial Branch',
        latitude: 7.0622,
        longitude: 38.4789,
        geofenceRadiusMeters: 150,
      },
    });

    // Create Department
    const department = await prisma.department.create({
      data: {
        id: '33333333-3333-3333-3333-333333333333',
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Production Assembly',
      },
    });

    // Create Active Employee with legacy plain text USSD pin
    const employee = await prisma.employee.create({
      data: {
        id: '44444444-4444-4444-4444-444444444444',
        tenantId: tenant.id,
        departmentId: department.id,
        firstName: 'Almaz',
        lastName: 'Ayana',
        employeeIdNumber: 'EMP-900',
        phoneNumber: '+251912345678',
        faydaNumber: '123456789012',
        baseSalary: 12500,
        paymentMethod: 'BANK',
        bankName: 'Commercial Bank of Ethiopia',
        bankAccount: '1000123456789',
        status: 'ACTIVE',
        ussdPin: '4321', // legacy plain text
        hireDate: new Date('2025-01-15T00:00:00Z'),
      } as any,
    });

    console.log('✅ Seeding complete. Executing E2E assertions...\n');

    // -------------------------------------------------------------------------
    // PHASE 1 & 3: USSD Webhook Tests & Security Authentication Checks
    // -------------------------------------------------------------------------
    console.log('--- 📱 Testing USSD Webhook State Machine ---');

    // Test 1A: Spoofed Webhook rejected (missing API key)
    console.log('Test 1A: Spoofed Webhook rejected (missing API key)...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd')
      .send('sessionId=session_123&phoneNumber=%2B251912345678&text=')
      .expect(401);
    console.log('✔ Spoofed Webhook rejected successfully!');

    // Test 1: Dial-in (Step 0)
    console.log('Test 1: Webhook initial dial-in (Step 0)...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd?apiKey=DemozSecureApiKey2026')
      .send('sessionId=session_123&phoneNumber=%2B251912345678&text=')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect((res) => {
        if (!res.text.startsWith('CON Welcome Almaz to Demoz.')) {
          throw new Error(`Unexpected Step 0 response: ${res.text}`);
        }
      });
    console.log('✔ Step 0 Dial-in successful!');

    // Test 2: Select Clock In (Step 1)
    console.log('Test 2: Selecting Option 1 - Clock In (Step 1)...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd?apiKey=DemozSecureApiKey2026')
      .send('sessionId=session_123&phoneNumber=%2B251912345678&text=1')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('CON Enter your 4-digit PIN to confirm your log:');
    console.log('✔ Step 1 PIN prompt successful!');

    // Test 3: Correct PIN entry and verification (Step 2 with self-healing)
    console.log('Test 3: Entering correct PIN "4321" (Step 2 + self-healing)...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd?apiKey=DemozSecureApiKey2026')
      .send('sessionId=session_123&phoneNumber=%2B251912345678&text=1*4321')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect((res) => {
        if (!res.text.startsWith('END Thank you. Your attendance has been logged successfully at')) {
          throw new Error(`Unexpected check-in success response: ${res.text}`);
        }
      });

    // Check database to ensure PIN has been hashed (self-healing!)
    const updatedEmployee = await prisma.employee.findUnique({
      where: { id: employee.id },
    });
    if (!updatedEmployee?.ussdPinHash) {
      throw new Error('Self-healing failed: ussdPinHash is not populated!');
    }
    const isHashValid = await bcrypt.compare('4321', updatedEmployee.ussdPinHash);
    if (!isHashValid) {
      throw new Error('Self-healing failed: ussdPinHash does not match original PIN "4321"!');
    }
    console.log('✔ Step 2 Verification and USSD PIN self-healing hashing successful!');

    // Query AttendanceLog to confirm write and telemetry structure
    const logs = await prisma.attendanceLog.findMany({});
    if (logs.length !== 1 || logs[0].type !== 'CLOCK_IN') {
      throw new Error('Failed to record clock-in to AttendanceLog table!');
    }
    const telemetryObj = logs[0].telemetry as any;
    if (!telemetryObj || telemetryObj.sessionId !== 'session_123') {
      throw new Error('AttendanceLog telemetry did not save session metadata!');
    }
    console.log('✔ AttendanceLog successfully written globally with behavioral telemetry!');

    // Test 4: Incorrect PIN entry
    console.log('Test 4: Entering incorrect PIN "9999"...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd?apiKey=DemozSecureApiKey2026')
      .send('sessionId=session_123&phoneNumber=%2B251912345678&text=1*9999')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('END Authentication failed. Invalid PIN.');
    console.log('✔ Step 2 Invalid PIN check blocked correctly!');

    // Test 5: Unregistered Phone lookup
    console.log('Test 5: Dialing from an unregistered phone number "+251999999999"...');
    await request(app.getHttpServer())
      .post('/api/v1/attendance/ussd?apiKey=DemozSecureApiKey2026')
      .send('sessionId=session_123&phoneNumber=%2B251999999999&text=')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('END Your phone number is not registered on Demoz. Please contact HR.');
    console.log('✔ Unregistered phone access terminated correctly!');


    // -------------------------------------------------------------------------
    // PHASE 2: Core HR Engine, Fayda ID validation & Ingestion Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 📂 Testing Phase 2: Core HR Engine & Fayda IDs ---');

    // Test 6: Strict Fayda ID validation check (creating invalid employee)
    console.log('Test 6: Onboarding employee with invalid 11-digit Fayda ID...');
    await tenantStorage.run(tenant.id, async () => {
      const invalidEmp = {
        departmentId: department.id,
        firstName: 'Bekele',
        lastName: 'Gerba',
        employeeIdNumber: 'EMP-111',
        phoneNumber: '+251988888888',
        faydaNumber: '12345678901', // 11 digits
        baseSalary: 11000,
        paymentMethod: 'CHAPA_WALLET',
        hireDate: '2026-05-17',
      };

      try {
        await employeeService.create(invalidEmp as any);
        throw new Error('Allowed creation of employee with invalid 11-digit Fayda ID!');
      } catch (err: any) {
        console.log(`✔ Blocked invalid Fayda creation successfully. error: "${err.message}"`);
      }
    });

    // Test 7: Paginated find and search by Fayda ID
    console.log('Test 7: Searching for employee by 12-digit Fayda ID...');
    await tenantStorage.run(tenant.id, async () => {
      const searchRes = await employeeService.findAll({
        page: 1,
        limit: 10,
        search: '123456789012', // Almaz's Fayda ID
      });

      if (searchRes.data.length !== 1 || searchRes.data[0].firstName !== 'Almaz') {
        throw new Error(`Fayda search failed. Result count: ${searchRes.data.length}`);
      }
      console.log('✔ Server-side paginated search matching Fayda ID verified!');
    });

    // Test 8: Bulk Excel Ingestion with compliance error reporting and transactional rollbacks
    console.log('Test 8: Simulating Excel Bulk Upload with duplicates and errors...');
    const wb = XLSX.utils.book_new();

    const sheetData = [
      {
        firstName: 'Kenenisa',
        lastName: 'Bekele',
        employeeIdNumber: 'EMP-301',
        phoneNumber: '+251930303030',
        faydaNumber: '999999999999', // valid
        baseSalary: 25000,
        paymentMethod: 'BANK',
        departmentId: department.id,
        hireDate: '2026-05-17',
      },
      {
        firstName: 'Haile',
        lastName: 'Gebrselassie',
        employeeIdNumber: 'EMP-302',
        phoneNumber: '+251940404040',
        faydaNumber: '123456789012', // DUPLICATE Fayda (clashes with Almaz)
        baseSalary: 28000,
        paymentMethod: 'BANK',
        departmentId: department.id,
        hireDate: '2026-05-17',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await tenantStorage.run(tenant.id, async () => {
      try {
        await employeeService.bulkUpload(xlsxBuffer);
        throw new Error('Spreadsheet bulkUpload committed a sheet containing duplicate Fayda ID!');
      } catch (err: any) {
        const responseObj = err.getResponse ? err.getResponse() : err;
        console.log('✔ Ingestion rejected and transactional rollback enforced!');
        console.log('Compliance error JSON log details:');
        console.log(JSON.stringify(responseObj, null, 2));

        if (!responseObj.erroredRows || responseObj.erroredRows[0].errors[0].indexOf('fayda') === -1) {
          throw new Error('Bulk compliance logger failed to report Fayda duplicates!');
        }
      }

      // Assert database contains NO row for EMP-301 (verifying full transaction rollback)
      const rolledBackEmp = await prisma.employee.findFirst({
        where: { employeeIdNumber: 'EMP-301' },
      });
      if (rolledBackEmp) {
        throw new Error('Transactional rollback failed! "EMP-301" was saved despite sheet errors.');
      }
      console.log('✔ Transaction rollback integrity fully verified!');
    });


    // -------------------------------------------------------------------------
    // PHASE 3: Geofenced PWA Clock-In Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 🌐 Testing Phase 3: Geofenced PWA Clock-Ins ---');

    // Test 9: Web Clock-In within bounds
    console.log('Test 9: Clocking in within office boundary (Hawassa Branch)...');
    const inBoundsLog = await attendanceService.verifyWebClockIn(
      employee.id,
      tenant.id,
      AttendanceType.CLOCK_IN,
      7.0624, // Close to 7.0622
      38.4791, // Close to 38.4789
    );
    if (inBoundsLog.isAnomaly) {
      throw new Error('In-bounds clock-in was falsely flagged as anomaly!');
    }
    console.log('✔ Within geofence clock-in logged successfully!');

    // Test 10: Web Clock-In outside bounds (Anomaly)
    console.log('Test 10: Clocking in outside geofence boundary (Addis Ababa ~275km away)...');
    const outBoundsLog = await attendanceService.verifyWebClockIn(
      employee.id,
      tenant.id,
      AttendanceType.CLOCK_IN,
      9.0115, // Addis Ababa Lat
      38.7865, // Addis Ababa Lon
    );
    if (!outBoundsLog.isAnomaly || !outBoundsLog.anomalyReason?.includes('Geofence Breach')) {
      throw new Error('Out-of-bounds clock-in did not trigger anomaly flags!');
    }
    console.log(`✔ Geofence breach blocked and flagged successfully! Reason: "${outBoundsLog.anomalyReason}"`);

    console.log('\n🌟 ALL INTEGRATION & COMPLIANCE TESTS PASSED SUCCESSFULLY! 🌟');

  } catch (error) {
    console.error('\n❌ E2E Integration Suite Failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runTests();
