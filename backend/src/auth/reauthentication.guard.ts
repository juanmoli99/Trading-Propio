import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRES_REAUTH_KEY } from './require-reauthentication.decorator';
import { SessionService } from './session.service';

@Injectable()
export class ReauthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_REAUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const cookieName =
      this.configService.get<string>('auth.cookieName') ?? 'trading_session';

    const token = this.readCookie(request.headers.cookie ?? '', cookieName);

    if (!token) {
      throw new UnauthorizedException('Recent reauthentication required');
    }

    const valid = await this.sessionService.isRecentlyReauthenticated(token);

    if (!valid) {
      throw new UnauthorizedException('Recent reauthentication required');
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
