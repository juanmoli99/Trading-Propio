import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { CorrelationContextService } from '../correlation/correlation-context.service';
import { SanitizedLogger } from '../logging/sanitized-logger.service';
import { classifyError } from './classify-error';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  category: string;
  correlationId?: string;
}

interface HttpLikeError {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: SanitizedLogger,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();

    const request = context.getRequest<{
      method?: string;
      url?: string;
    }>();

    const statusCode = this.getStatusCode(exception);
    const message = this.getMessage(exception, statusCode);
    const classification = classifyError(exception);
    const correlationId = this.correlationContext.getCorrelationId();

    this.logger.error({
      event: 'unhandled_request_exception',
      correlationId,
      method: request.method ?? 'UNKNOWN',
      path: request.url ?? 'UNKNOWN',
      statusCode,
      category: classification.category,
      severity: classification.severity,
      exception,
    });

    const response: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url ?? 'UNKNOWN',
      message,
      category: classification.category,
      correlationId,
    };

    httpAdapter.reply(context.getResponse(), response, statusCode);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (typeof exception === 'object' && exception !== null) {
      const httpError = exception as HttpLikeError;

      const candidate =
        typeof httpError.status === 'number'
          ? httpError.status
          : typeof httpError.statusCode === 'number'
            ? httpError.statusCode
            : undefined;

      if (candidate !== undefined && candidate >= 400 && candidate <= 599) {
        return candidate;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(
    exception: unknown,
    statusCode: number,
  ): string | string[] {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (
          response as {
            message?: unknown;
          }
        ).message;

        if (typeof message === 'string') {
          return message;
        }

        if (
          Array.isArray(message) &&
          message.every((item) => typeof item === 'string')
        ) {
          return message;
        }
      }

      return exception.message;
    }

    if (statusCode === HttpStatus.PAYLOAD_TOO_LARGE) {
      return 'Payload too large';
    }

    return 'Internal server error';
  }
}
