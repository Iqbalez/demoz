import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService, PrismaService],
})
export class InvitationModule {}
