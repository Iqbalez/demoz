import { Controller, Post, Body, Get, Param, Res, BadRequestException, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { tenantStorage } from '../tenant-context';
import { PayrollStatus } from '@prisma/client';
import { DashboardService } from '../dashboard/dashboard.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { PayrollDisburseService } from './payroll-disburse.service';
import { PayslipService } from './payslip.service';
import type { Response } from 'express';
import archiver = require('archiver');

@Controller('api/v1/payroll')
export class PayrollController {
  constructor(
    @InjectQueue('payroll-queue') private readonly payrollQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly payrollCalcService: PayrollCalculationService,
    private readonly payrollDisburseService: PayrollDisburseService,
    private readonly payslipService: PayslipService,
  ) {}

  /**
   * Triggers an asynchronous background payroll generation event.
   * Immediately returns 202 Accepted to safeguard connection thresholds.
   */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerPayrollRun(
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const { periodStart, periodEnd } = body;
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('Missing periodStart or periodEnd parameters.');
    }

    const start = new Date(periodStart.includes('T') ? periodStart : `${periodStart}T00:00:00.000Z`);
    const end = new Date(periodEnd.includes('T') ? periodEnd : `${periodEnd}T23:59:59.999Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format for periodStart or periodEnd.');
    }

    if (start >= end) {
      throw new BadRequestException('periodStart must be before periodEnd.');
    }

    // Initialize the transient parent PayrollRun context in the DB
    let payrollRun;
    try {
      payrollRun = await this.prisma.payrollRun.create({
        data: {
          tenantId,
          status: PayrollStatus.PENDING,
          periodStart: start,
          periodEnd: end,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('A payroll run for this period already exists.');
      }
      throw err;
    }

    // Enqueue job on background BullMQ processor
    await this.payrollQueue.add(
      'calculate-payroll',
      {
        tenantId,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        payrollRunId: payrollRun.id,
      },
      {
        jobId: payrollRun.id, // Prevent duplicate jobs by mapping run ID to jobId
      },
    );

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    return {
      payrollRunId: payrollRun.id,
      status: 'PROCESSING',
    };
  }

  /**
   * Returns comprehensive parent status, AI audit indicators, and worker line items.
   */
  @Get('status/:runId')
  async getPayrollRunStatus(@Param('runId') runId: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const run = await this.prisma.payrollRun.findFirst({
      where: {
        id: runId,
        tenantId,
      },
      include: {
        aiAuditReport: true,
        payrollLineItems: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!run) {
      throw new BadRequestException('Payroll run not found.');
    }

    return run;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENDPOINT 1 — POST /api/v1/payroll/runs/generate
  // Synchronous DRAFT payroll generation using Ethiopian tax brackets
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates a complete DRAFT payroll run for all ACTIVE employees.
   * Uses Proclamation No. 979/2016 income tax brackets and
   * Proclamation No. 714/2011 pension rates (7% employee / 11% employer).
   *
   * Returns the created PayrollRun with all PayrollLineItems.
   * Status: 201 Created
   * On conflict: 409 Payroll already exists for this period
   */
  @Post('runs/generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePayrollRun(@Body() body: GeneratePayrollDto) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const { period } = body;
    if (!period) {
      throw new BadRequestException('Missing required field: period (YYYY-MM)');
    }

    return this.payrollCalcService.generateCompletePayrollRun(tenantId, period);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENDPOINT 2 — POST /api/v1/payroll/runs/:runId/lock
  // Transitions a DRAFT payroll run to OWNER_APPROVED (locked)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Locks a DRAFT payroll run, marking it read-only and ready for disbursement.
   *
   * Returns the updated PayrollRun.
   * Status: 200 OK
   * On invalid state: 400 Can only lock DRAFT payroll runs
   */
  @Post('runs/:runId/lock')
  @HttpCode(HttpStatus.OK)
  async lockPayrollRun(@Param('runId') runId: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }
    return this.payrollCalcService.lockPayrollRun(runId);
  }

  /**
   * Enqueues bulk disbursement via Chapa + BullMQ. Requires OWNER_APPROVED.
   */
  @Post('runs/:runId/disburse')
  @HttpCode(HttpStatus.ACCEPTED)
  async disbursePayrollRun(@Param('runId') runId: string) {
    return this.payrollDisburseService.enqueueDisbursement(runId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAYSLIP ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Download a single payslip PDF for one employee in a payroll run.
   */
  @Get('runs/:payrollRunId/payslips/:employeeId')
  async downloadPayslip(
    @Param('payrollRunId') payrollRunId: string,
    @Param('employeeId') employeeId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.payslipService.generatePayslipPDF(payrollRunId, employeeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${employeeId}-${Date.now()}.pdf"`);
    res.send(pdf);
  }

  /**
   * Bulk download all payslips for a payroll run as a ZIP archive.
   */
  @Get('runs/:payrollRunId/payslips-bulk')
  async downloadAllPayslips(
    @Param('payrollRunId') payrollRunId: string,
    @Res() res: Response,
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    // Get all line items for this payroll run
    const lineItems = await this.prisma.payrollLineItem.findMany({
      where: { payrollRunId },
      select: {
        employeeId: true,
        employee: { select: { firstName: true, lastName: true, employeeIdNumber: true } },
      },
    });

    if (!lineItems.length) {
      throw new BadRequestException('No employees found in this payroll run.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="payslips-${payrollRunId}-${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const item of lineItems) {
      try {
        const pdf = await this.payslipService.generatePayslipPDF(payrollRunId, item.employeeId);
        const filename = `payslip-${item.employee.employeeIdNumber}-${item.employee.firstName}-${item.employee.lastName}.pdf`;
        archive.append(pdf, { name: filename });
      } catch (err) {
        // Skip failed individual payslips, log and continue
        console.error(`Failed to generate payslip for employee ${item.employeeId}:`, err);
      }
    }

    await archive.finalize();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ERCA MONTHLY REPORT ENDPOINT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Download the ERCA Monthly Summary Report PDF for a given year and month.
   */
  @Get('reports/erca-monthly/:year/:month')
  async ercaMonthlyReport(
    @Param('year') year: string,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      throw new BadRequestException('Invalid year or month parameter.');
    }

    const pdf = await this.payslipService.generateErcaMonthlyReport(tenantId, y, m);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="erca-report-${year}-${month}.pdf"`);
    res.send(pdf);
  }

  /**
   * List all payroll runs (for the payslip history view).
   */
  @Get('runs')
  async listPayrollRuns() {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    return this.prisma.payrollRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        payrollLineItems: {
          select: {
            id: true,
            employeeId: true,
            grossSalary: true,
            netPay: true,
            incomeTax: true,
            pensionDeduction: true,
            employee: {
              select: { firstName: true, lastName: true, employeeIdNumber: true },
            },
          },
        },
      },
    });
  }
}
