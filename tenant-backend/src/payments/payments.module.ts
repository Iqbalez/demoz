import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentQueueProcessor } from './payment-queue.processor';
import { PrismaService } from '../prisma.service';
@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-verification' }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentQueueProcessor, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
