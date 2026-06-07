import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { TenantMiddleware } from './tenant.middleware';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HrModule } from './hr/hr.module';
import { AttendanceModule } from './attendance/attendance.module';
import { UssdModule } from './ussd/ussd.module';
import { BullModule } from '@nestjs/bullmq';
import { PayrollModule } from './payroll/payroll.module';
import { FinanceModule } from './finance/finance.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { LeaveModule } from './leave/leave.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenantLifecycleGuard } from './auth/tenant-lifecycle.guard';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

import { RedisModule } from './redis/redis.module';
import { createBullConnection } from './redis/redis.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { RealtimeModule } from './realtime/realtime.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { InternalModule } from './internal/internal.module';
import { RetentionModule } from './retention/retention.module';
import { ScheduleModule } from '@nestjs/schedule';
import { InvitationModule } from './invitation/invitation.module';
import { SharedModule } from './shared/shared.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    RedisModule,
    DashboardModule,
    RealtimeModule,
    WebhooksModule,
    InternalModule,
    RetentionModule,
    ScheduleModule.forRoot(),
    AuthModule,
    HrModule,
    AttendanceModule,
    UssdModule,
    InvitationModule,
    BullModule.forRoot({
      connection: createBullConnection(),
    }),
    PaymentsModule,
    PayrollModule,
    FinanceModule,
    SubscriptionModule,
    LeaveModule,
    NotificationsModule,
    OnboardingModule,
    SharedModule,
    SettingsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantLifecycleGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}

