import { Global, Module } from '@nestjs/common';
import { RegulatoryAccountConsistencyService } from './regulatory-account-consistency.service';
import { RegulatoryRulesService } from './regulatory-rules.service';

@Global()
@Module({
  providers: [RegulatoryAccountConsistencyService, RegulatoryRulesService],
  exports: [RegulatoryAccountConsistencyService, RegulatoryRulesService],
})
export class RegulatoryRulesModule {}
