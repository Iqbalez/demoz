import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { HrModule } from '../hr/hr.module';
import { LeaveModule } from '../leave/leave.module';

@Module({
  imports: [AuthModule, HrModule, LeaveModule],
  controllers: [InternalController],
  providers: [InternalService, PrismaService],
})
export class InternalModule {}
