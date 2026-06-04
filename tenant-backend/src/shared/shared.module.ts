import { Global, Module } from '@nestjs/common';
import { EthiopianCalendarService } from './ethiopian-calendar/ethiopian-calendar.service';

@Global()
@Module({
  providers: [EthiopianCalendarService],
  exports: [EthiopianCalendarService],
})
export class SharedModule {}
