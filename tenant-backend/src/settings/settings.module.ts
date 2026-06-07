import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AuditService } from './audit.service';

@Module({
  controllers: [SettingsController, RolesController],
  providers: [SettingsService, RolesService, AuditService, PrismaService, PermissionsGuard],
  exports: [SettingsService, RolesService, AuditService],
})
export class SettingsModule {}
