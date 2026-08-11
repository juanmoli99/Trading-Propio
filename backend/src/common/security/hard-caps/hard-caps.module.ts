import { Global, Module } from '@nestjs/common';
import { HardCapsService } from './hard-caps.service';

@Global()
@Module({
  providers: [HardCapsService],
  exports: [HardCapsService],
})
export class HardCapsModule {}
