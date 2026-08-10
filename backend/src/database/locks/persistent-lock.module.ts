import { Global, Module } from '@nestjs/common';
import { PersistentLockService } from './persistent-lock.service';

@Global()
@Module({
  providers: [PersistentLockService],
  exports: [PersistentLockService],
})
export class PersistentLockModule {}
