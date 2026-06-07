import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PrismaService } from '../prisma.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { BullModule } from '@nestjs/bullmq';
import { FaydaProcessor } from './fayda.processor';
import { FaydaOidcService } from './fayda-oidc.service';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { LeaveModule } from '../leave/leave.module';
import { SettingsModule } from '../settings/settings.module';
@Module({
  imports: [
    SubscriptionModule,
    NotificationsModule,
    LeaveModule,
    SettingsModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'fayda-queue',
    }),
  ],
  controllers: [EmployeeController, WorkspaceController],
  providers: [EmployeeService, WorkspaceService, PrismaService, FaydaProcessor, FaydaOidcService],
  exports: [WorkspaceService, EmployeeService],
})
export class HrModule {}