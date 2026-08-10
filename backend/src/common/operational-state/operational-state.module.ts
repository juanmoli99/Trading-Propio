import { Global, Module } from '@nestjs/common';
import { OperationalStateService } from './operational-state.service';

@Global()
@Module({
  providers: [OperationalStateService],
  exports: [OperationalStateService],
})
export class OperationalStateModule {}
