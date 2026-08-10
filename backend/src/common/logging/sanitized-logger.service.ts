import { Injectable, type LoggerService } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pino, { type Logger, multistream } from 'pino';
import { CorrelationContextService } from '../correlation/correlation-context.service';
import { redactSecrets } from './redact-secrets';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

interface StructuredLog {
  message?: unknown;
  context?: string;
  correlationId?: string;
  [key: string]: unknown;
}

@Injectable()
export class SanitizedLogger implements LoggerService {
  private readonly logger: Logger;

  constructor(private readonly correlationContext?: CorrelationContextService) {
    const logDirectory = join(process.cwd(), 'logs');
    const logFile = join(logDirectory, 'application.log');

    mkdirSync(logDirectory, {
      recursive: true,
    });

    const streams = multistream([
      {
        level: process.env.LOG_LEVEL ?? 'info',
        stream: process.stdout,
      },
      {
        level: process.env.LOG_LEVEL ?? 'info',
        stream: pino.destination({
          dest: logFile,
          sync: false,
          mkdir: true,
        }),
      },
    ]);

    this.logger = pino(
      {
        level: process.env.LOG_LEVEL ?? 'info',
        base: {
          service: 'trading-backend',
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      streams,
    );
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const payload = this.buildPayload(message, optionalParams);

    switch (level) {
      case 'error':
        this.logger.error(payload);
        break;
      case 'warn':
        this.logger.warn(payload);
        break;
      case 'debug':
        this.logger.debug(payload);
        break;
      case 'verbose':
        this.logger.trace(payload);
        break;
      case 'fatal':
        this.logger.fatal(payload);
        break;
      case 'log':
      default:
        this.logger.info(payload);
        break;
    }
  }

  private buildPayload(
    message: unknown,
    optionalParams: unknown[],
  ): StructuredLog {
    const sanitizedMessage = redactSecrets(message);

    const sanitizedParams = optionalParams.map((item) => redactSecrets(item));

    const correlationId = this.correlationContext?.getCorrelationId();

    if (
      typeof sanitizedMessage === 'object' &&
      sanitizedMessage !== null &&
      !Array.isArray(sanitizedMessage)
    ) {
      return {
        ...(sanitizedMessage as Record<string, unknown>),
        correlationId,
        params: sanitizedParams.length > 0 ? sanitizedParams : undefined,
      };
    }

    return {
      message: sanitizedMessage,
      correlationId,
      params: sanitizedParams.length > 0 ? sanitizedParams : undefined,
    };
  }
}
