import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AlpacaModule } from './alpaca/alpaca.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/csrf.guard';
import { ReauthenticationGuard } from './auth/reauthentication.guard';
import { SessionAuthGuard } from './auth/session-auth.guard';
import { AuditModule } from './common/audit/audit.module';
import { CorrelationModule } from './common/correlation/correlation.module';
import { CorrelationIdMiddleware } from './common/correlation/correlation-id.middleware';
import { SanitizedLogger } from './common/logging/sanitized-logger.service';
import { OperationalStateModule } from './common/operational-state/operational-state.module';
import { HardCapsModule } from './common/security/hard-caps/hard-caps.module';
import { HttpsEnforcementMiddleware } from './common/security/https-enforcement.middleware';
import { RATE_LIMITS } from './common/security/rate-limit.constants';
import { SensitiveResponseInterceptor } from './common/security/sensitive-response.interceptor';
import { StartupModule } from './common/startup/startup.module';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { RegulatoryRulesModule } from './regulatory/regulatory-rules.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RegulatoryRulesModule,
    AlpacaModule,
    CorrelationModule,
    AuditModule,
    HardCapsModule,
    OperationalStateModule,
    StartupModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: RATE_LIMITS.DEFAULT.ttl,
        limit: RATE_LIMITS.DEFAULT.limit,
      },
    ]),
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpsEnforcementMiddleware,
    SanitizedLogger,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ReauthenticationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SensitiveResponseInterceptor,
    },
  ],
  exports: [SanitizedLogger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, HttpsEnforcementMiddleware)
      .forRoutes('*');
  }
}
