import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SessionService } from './session.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (request.method === 'POST' && request.path === '/auth/login') {
      return true;
    }

    const sessionCookieName =
      this.configService.get<string>('auth.cookieName') ?? 'trading_session';

    const cookieHeader = request.headers.cookie ?? '';

    const sessionToken = this.readCookie(cookieHeader, sessionCookieName);

    if (!sessionToken) {
      throw new ForbiddenException('CSRF validation failed');
    }

    const csrfToken = request.headers['x-csrf-token'];

    if (typeof csrfToken !== 'string' || !csrfToken) {
      throw new ForbiddenException('CSRF validation failed');
    }

    const session = await this.sessionService.findValidSession(sessionToken);

    if (!session) {
      throw new ForbiddenException('CSRF validation failed');
    }

    const suppliedHash = this.sessionService.hashToken(csrfToken);

    if (suppliedHash !== session.csrfTokenHash) {
      throw new ForbiddenException('CSRF validation failed');
    }

    return true;
  }

  private readCookie(cookieHeader: string, name: string): string | undefined {
    const prefix = `${name}=`;

    return cookieHeader
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length);
  }
}
