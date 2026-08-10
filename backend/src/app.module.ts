import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorrelationContextService } from './common/correlation/correlation-context.service';
import { CorrelationIdMiddleware } from './common/correlation/correlation-id.middleware';
import { SanitizedLogger } from './common/logging/sanitized-logger.service';
import { OperationalStateModule } from './common/operational-state/operational-state.module';
import { StartupModule } from './common/startup/startup.module';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    OperationalStateModule,
    StartupModule,
    PrismaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CorrelationContextService,
    CorrelationIdMiddleware,
    SanitizedLogger,
  ],
  exports: [CorrelationContextService, SanitizedLogger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
