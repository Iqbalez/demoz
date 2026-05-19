import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PrismaService } from '../prisma.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { BullModule } from '@nestjs/bullmq';
import { FaydaProcessor } from './fayda.processor';

@Module({
  imports: [
    SubscriptionModule,
    BullModule.registerQueue({
      name: 'fayda-queue',
    }),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, PrismaService, FaydaProcessor],
})
export class HrModule {}