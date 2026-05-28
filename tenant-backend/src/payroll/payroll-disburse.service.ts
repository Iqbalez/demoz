import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PayrollStatus } from '@prisma/client';
import { tenantStorage } from '../tenant-context';

@Injectable()
export class PayrollDisburseService {
  private readonly logger = new Logger(PayrollDisburseService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('payroll-disburse') private readonly disburseQueue: Queue,
  ) {}

  async enqueueDisbursement(payrollRunId: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) throw new BadRequestException('Active tenant context is missing.');

    const run = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!run) throw new BadRequestException('Payroll run not found.');
    if (run.status !== PayrollStatus.OWNER_APPROVED) {
      throw new BadRequestException('Payroll run must be OWNER_APPROVED before disbursement.');
    }

    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: PayrollStatus.PROCESSING_PAYOUT },
    });

    await this.disburseQueue.add(
      'disburse-payroll',
      { tenantId, payrollRunId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `disburse:${payrollRunId}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`Enqueued payroll disbursement for run ${payrollRunId}`);
    return { queued: true, payrollRunId };
  }
}

