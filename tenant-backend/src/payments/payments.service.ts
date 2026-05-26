import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChapaWebhookPayload } from './dto/chapa-webhook.dto';
import { createHmac } from 'crypto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('payment-verification') private readonly paymentQueue: Queue,
  ) {}

  async resolveTenantFromTxRef(txRef: string): Promise<string> {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { txRef },
      select: { tenantId: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found for txRef: ' + txRef);
    }

    return transaction.tenantId;
  }

  async handleWebhook(payload: ChapaWebhookPayload, rawSignature: string, rawBody: Buffer) {
    // Step 1: Verify HMAC signature
    const secret = process.env.CHAPA_WEBHOOK_SECRET || '';
    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
      
    if (rawSignature !== expected) {
      this.logger.error(`Invalid webhook signature for txRef: ${payload.tx_ref}`);
      throw new UnauthorizedException('Invalid Chapa webhook signature');
    }

    // Step 2: Idempotency check
    const existingTx = await this.prisma.paymentTransaction.findUnique({
      where: { txRef: payload.tx_ref },
    });

    if (existingTx && existingTx.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Transaction ${payload.tx_ref} already COMPLETED. Skipping.`);
      return { received: true, status: 'already_processed' };
    }

    // Step 3: Upsert the transaction to WEBHOOK_RECV state
    const resolvedTenantId = await this.resolveTenantFromTxRef(payload.tx_ref);

    await this.prisma.paymentTransaction.upsert({
      where: { txRef: payload.tx_ref },
      create: {
        txRef: payload.tx_ref,
        status: PaymentStatus.WEBHOOK_RECV,
        webhookPayload: payload as any,
        amount: parseFloat(payload.amount),
        currency: payload.currency,
        tenantId: resolvedTenantId,
      },
      update: {
        status: PaymentStatus.WEBHOOK_RECV,
        webhookPayload: payload as any,
      },
    });

    // Step 4: Enqueue verification job
    await this.paymentQueue.add(
      'verify-transaction',
      { txRef: payload.tx_ref, tenantId: resolvedTenantId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    // Step 5: Return { received: true } immediately
    return { received: true };
  }

  async getTransactionStatus(txRef: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { txRef },
      select: {
        txRef: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found for txRef: ' + txRef);
    }

    return transaction;
  }
}
