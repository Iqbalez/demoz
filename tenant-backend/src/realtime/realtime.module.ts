import { Module } from '@nestjs/common';
import { PayrollGateway } from './payroll.gateway';

@Module({
  providers: [PayrollGateway],
  exports: [PayrollGateway],
})
export class RealtimeModule {}

