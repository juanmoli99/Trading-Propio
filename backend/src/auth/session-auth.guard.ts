import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AUTHENTICATED_PRINCIPAL,
  type AuthenticatedPrincipal,
} from './authenticated-principal';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionService } from './session.service';

type AuthenticatedRequest = Request & {
  [AUTHENTICATED_PRINCIPAL]?: AuthenticatedPrincipal;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const sessionCookieName =
      this.configService.get<string>('auth.cookieName') ?? 'trading_session';

    const sessionToken = this.readCookie(
      request.headers.cookie ?? '',
      sessionCookieName,
    );

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessionService.findValidSession(sessionToken);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request[AUTHENTICATED_PRINCIPAL] = {
      id: session.operator.id,
      username: session.operator.username,
      displayName: session.operator.displayName,
    };

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
