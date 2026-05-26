import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { addMonths } from 'date-fns';
import { PaymentStatus, TenantStatus } from '@prisma/client';

@Processor('payment-verification')
export class PaymentQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ txRef: string; tenantId: string }>): Promise<any> {
    const { txRef, tenantId } = job.data;

    this.logger.log(`Verifying transaction: ${txRef}`);

    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
        timeout: 10000,
      },
    );

    if (response.data.status !== 'success') {
      throw new Error('Chapa verification returned non-success status — BullMQ will retry');
    }

    this.logger.log(`Verification successful for transaction: ${txRef}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { txRef },
        data: {
          status: PaymentStatus.COMPLETED,
          resolvedAt: new Date(),
          chapaRef: response.data.data?.reference,
        },
      });

      const newExpiry = addMonths(new Date(), 1);
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: TenantStatus.ACTIVE,
          subscriptionExpiresAt: newExpiry,
        },
      });
    });

    this.logger.log(`Payment transaction ${txRef} processed and tenant activated.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[PaymentQueue] Job ${job.id} failed after ${job.attemptsMade} attempts. ` +
        `txRef: ${job.data?.txRef}. Error: ${error.message}`,
    );
  }
}
