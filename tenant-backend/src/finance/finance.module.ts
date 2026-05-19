import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [FinanceController],
  providers: [FinanceService, PrismaService],
})
export class FinanceModule {}
