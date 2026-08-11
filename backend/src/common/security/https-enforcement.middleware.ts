import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

const HSTS_MAX_AGE_SECONDS = 31536000;

@Injectable()
export class HttpsEnforcementMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const isDevelopment =
      this.configService.get<boolean>('app.isDevelopment') ?? false;

    const isProduction =
      this.configService.get<boolean>('app.isProduction') ?? false;

    if (isDevelopment) {
      next();
      return;
    }

    const forwardedProto = request.headers['x-forwarded-proto'];

    const protocol =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0]?.trim().toLowerCase()
        : undefined;

    const isHttps = request.secure || protocol === 'https';

    if (!isHttps) {
      response.status(426).json({
        statusCode: 426,
        message: 'HTTPS is required',
      });

      return;
    }

    if (isProduction) {
      response.setHeader(
        'Strict-Transport-Security',
        `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
      );
    }

    next();
  }
}
