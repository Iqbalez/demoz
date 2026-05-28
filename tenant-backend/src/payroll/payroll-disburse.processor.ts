import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChapaClient, type ChapaBulkRecipient } from '../lib/chapa/client';
import { PayrollGateway } from '../realtime/payroll.gateway';
import { PayrollStatus, PayoutStatus } from '@prisma/client';
import { tenantStorage } from '../tenant-context';
import { Prisma } from '@prisma/client';

@Processor('payroll-disburse')
export class PayrollDisburseProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollDisburseProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PayrollGateway,
  ) {
    super();
  }

  async process(job: Job<{ tenantId: string; payrollRunId: string }>): Promise<void> {
    const { tenantId, payrollRunId } = job.data;

    return tenantStorage.run(tenantId, async () => {
      const secret = process.env.CHAPA_SECRET_KEY;
      if (!secret) throw new Error('CHAPA_SECRET_KEY missing');

      const run = await this.prisma.payrollRun.findFirst({
        where: { id: payrollRunId, tenantId },
        include: {
          payrollLineItems: {
            include: { employee: true },
          },
        },
      });
      if (!run) throw new Error('PayrollRun not found');

      // Build recipients (skip invalid banking data)
      const recipients: ChapaBulkRecipient[] = [];
      for (const li of run.payrollLineItems) {
        const accountNumber = li.bankAccount ? String(li.bankAccount) : '';
        const bankCode = li.bankCode ? String(li.bankCode) : '';
        const accountName = li.employee ? `${li.employee.firstName} ${li.employee.lastName}` : 'Employee';

        if (!accountNumber || !bankCode) {
          await this.prisma.payrollLineItem.update({
            where: { id: li.id },
            data: { payoutStatus: PayoutStatus.FAILED },
          });
          continue;
        }

        const reference = `DEMOZ-${payrollRunId}-${li.employeeId}`;
        recipients.push({
          account_name: accountName,
          account_number: accountNumber,
          amount: Number(new Prisma.Decimal(li.netPay).toFixed(2)),
          reference,
          bank_code: bankCode,
        });

        await this.prisma.payrollLineItem.update({
          where: { id: li.id },
          data: {
            chapaReference: reference,
            payoutStatus: PayoutStatus.PENDING,
          },
        });
      }

      if (recipients.length === 0) {
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: { status: PayrollStatus.PAYOUT_FAILED, errorMessage: 'No valid recipients for disbursement.' },
        });
        this.gateway.emitToTenant(tenantId, 'payroll:payout', {
          payrollRunId,
          status: 'PAYOUT_FAILED',
          reason: 'NO_RECIPIENTS',
        });
        return;
      }

      const chapa = new ChapaClient(secret);

      // Chapa bulk transfers: max 100 per batch, wait 5 seconds between batches.
      const batches: ChapaBulkRecipient[][] = [];
      for (let i = 0; i < recipients.length; i += 100) {
        batches.push(recipients.slice(i, i + 100));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const { batchId } = await chapa.initiateBulkTransfer({
          title: `Demoz Payroll ${payrollRunId} (${i + 1}/${batches.length})`,
          currency: 'ETB',
          bulk_data: batch,
        });

        this.logger.log(`Chapa batch submitted batchId=${batchId} run=${payrollRunId} size=${batch.length}`);
        this.gateway.emitToTenant(tenantId, 'payroll:payout', {
          payrollRunId,
          status: 'BATCH_SUBMITTED',
          batchId,
          batchIndex: i,
          batchSize: batch.length,
        });

        if (i < batches.length - 1) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      // Final status remains PROCESSING_PAYOUT until webhooks mark items SUCCESS/FAILED.
      this.gateway.emitToTenant(tenantId, 'payroll:payout', {
        payrollRunId,
        status: 'PROCESSING_PAYOUT',
      });
    });
  }
}

