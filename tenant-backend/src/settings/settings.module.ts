import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AuditService } from './audit.service';

@Module({
  controllers: [SettingsController, RolesController],
  providers: [SettingsService, RolesService, AuditService],
  exports: [SettingsService, RolesService, AuditService],
})
export class SettingsModule {}
