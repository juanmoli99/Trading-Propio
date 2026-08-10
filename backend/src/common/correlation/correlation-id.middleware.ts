import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { CorrelationContextService } from './correlation-context.service';

const correlationHeader = 'x-correlation-id';

function getCorrelationId(request: Request): string {
  const incoming = request.header(correlationHeader);

  if (
    incoming &&
    incoming.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/.test(incoming)
  ) {
    return incoming;
  }

  return randomUUID();
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly correlationContext: CorrelationContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const correlationId = getCorrelationId(request);

    response.setHeader('X-Correlation-Id', correlationId);

    this.correlationContext.run(correlationId, next);
  }
}
