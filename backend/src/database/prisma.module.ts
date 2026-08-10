import { Global, Module } from '@nestjs/common';
import { PersistentLockModule } from './locks/persistent-lock.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [PersistentLockModule],
  providers: [PrismaService],
  exports: [PrismaService, PersistentLockModule],
})
export class PrismaModule {}
