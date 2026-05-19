import { Module } from '@nestjs/common';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [UssdController],
  providers: [UssdService, PrismaService],
  exports: [UssdService],
})
export class UssdModule {}
