import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CorrelationContextService } from './common/correlation/correlation-context.service';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { SanitizedLogger } from './common/logging/sanitized-logger.service';
import { OperationalStateService } from './common/operational-state/operational-state.service';
import { StartupService } from './common/startup/startup.service';

async function shutdownApplication(
  app: INestApplication,
  logger: SanitizedLogger,
  operationalState: OperationalStateService,
  timeoutMs: number,
  signal: NodeJS.Signals,
): Promise<void> {
  operationalState.setStatus('BLOCKED', `Shutdown in progress: ${signal}`);

  operationalState.setComponentState(
    'application',
    false,
    `Shutdown in progress: ${signal}`,
  );

  logger.warn({
    event: 'application_shutdown_started',
    signal,
    timeoutMs,
  });

  const forceShutdownTimer = setTimeout(() => {
    logger.fatal({
      event: 'application_shutdown_timeout',
      signal,
      timeoutMs,
    });

    process.exit(1);
  }, timeoutMs);

  forceShutdownTimer.unref();

  try {
    await app.close();

    clearTimeout(forceShutdownTimer);

    logger.log({
      event: 'application_shutdown_completed',
      signal,
    });

    process.exitCode = 0;
  } catch (error) {
    clearTimeout(forceShutdownTimer);

    logger.fatal({
      event: 'application_shutdown_failed',
      signal,
      error,
    });

    process.exitCode = 1;
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = app.get(SanitizedLogger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const httpAdapterHost = app.get(HttpAdapterHost);
  const correlationContext = app.get(CorrelationContextService);
  const operationalState = app.get(OperationalStateService);
  const startupService = app.get(StartupService);

  const port = configService.get<number>('app.port') ?? 3000;

  const gracefulShutdownTimeoutMs =
    configService.get<number>('operational.gracefulShutdownTimeoutMs') ?? 10000;

  const allowedOrigins =
    configService.get<string[]>('cors.allowedOrigins') ?? [];

  app.use(
    json({
      limit: '64kb',
    }),
  );

  app.use(
    urlencoded({
      limit: '32kb',
      extended: false,
      parameterLimit: 100,
    }),
  );

  app.use(
    helmet({
      hsts: false,
    }),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  });

  operationalState.setStatus('BLOCKED', 'Application startup in progress');

  operationalState.setComponentState(
    'application',
    false,
    'Application startup in progress',
  );

  logger.log({
    event: 'application_startup_started',
    port,
  });

  app.useGlobalFilters(
    new GlobalExceptionFilter(httpAdapterHost, logger, correlationContext),
  );

  app.enableShutdownHooks();

  let shuttingDown = false;

  const handleShutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    void shutdownApplication(
      app,
      logger,
      operationalState,
      gracefulShutdownTimeoutMs,
      signal,
    );
  };

  process.once('SIGINT', () => {
    handleShutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    handleShutdown('SIGTERM');
  });

  const startupChecks = startupService.runCriticalChecks();

  startupService.assertCriticalChecksPassed(startupChecks);

  await app.listen(port);

  operationalState.setComponentState('application', true);

  operationalState.setStatus(
    'READY',
    'All currently registered critical startup checks passed',
  );

  logger.log({
    event: 'application_startup_completed',
    port,
    startupChecks,
  });
}

void bootstrap();
