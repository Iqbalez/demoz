import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentQueueProcessor } from './payment-queue.processor';
import { PrismaService } from '../prisma.service';
import { bullWorkerProviders } from '../redis/bull-worker.providers';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-verification' }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, ...bullWorkerProviders(PaymentQueueProcessor), PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
