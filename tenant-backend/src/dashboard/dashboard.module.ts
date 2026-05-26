import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Global()
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
  exports: [DashboardService],
})
export class DashboardModule {}
