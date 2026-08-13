import { Module } from '@nestjs/common';
import { SymbolValidationService } from './symbol-validation.service';

@Module({
  providers: [SymbolValidationService],
  exports: [SymbolValidationService],
})
export class SymbolsModule {}
