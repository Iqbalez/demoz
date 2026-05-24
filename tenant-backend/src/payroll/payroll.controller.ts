import { Controller, Post, Body, Get, Param, BadRequestException, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { tenantStorage } from '../tenant-context';
import { PayrollStatus } from '@prisma/client';

@Controller('api/v1/payroll')
export class PayrollController {
  constructor(
    @InjectQueue('payroll-queue') private readonly payrollQueue: Queue,
    private readonly prisma: PrismaService,
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
}
