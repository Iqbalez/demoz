import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { CsvParserService } from './csv-parser.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    NotificationsModule,
    SettingsModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10 MB limit
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, CsvParserService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
