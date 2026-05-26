import { Module } from '@nestjs/common';
import { AfromessageService } from './afromessage.service';

@Module({
  providers: [AfromessageService],
  exports: [AfromessageService],
})
export class NotificationsModule {}
