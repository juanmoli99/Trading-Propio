import { Global, Module } from '@nestjs/common';
import { CorrelationContextService } from './correlation-context.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Global()
@Module({
  providers: [CorrelationContextService, CorrelationIdMiddleware],
  exports: [CorrelationContextService, CorrelationIdMiddleware],
})
export class CorrelationModule {}
