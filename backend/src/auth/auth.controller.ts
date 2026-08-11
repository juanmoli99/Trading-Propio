import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RATE_LIMITS } from '../common/security/rate-limit.constants';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import { type LoginInput, loginSchema } from './login.schema';
import { Public } from './public.decorator';
import { RequireReauthentication } from './require-reauthentication.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: RATE_LIMITS.LOGIN.limit,
      ttl: RATE_LIMITS.LOGIN.ttl,
    },
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema))
    body: LoginInput,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.authService.login(body.username, body.password);

    const sessionCookieName = this.getSessionCookieName();

    const secure = this.getSecureCookieSetting();

    response.cookie(sessionCookieName, result.sessionToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      expires: result.expiresAt,
    });

    response.cookie('trading_csrf', result.csrfToken, {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      path: '/',
      expires: result.expiresAt,
    });

    return {
      operator: result.operator,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    default: {
      limit: RATE_LIMITS.SENSITIVE.limit,
      ttl: RATE_LIMITS.SENSITIVE.ttl,
    },
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<void> {
    const sessionToken = this.getSessionToken(request);

    await this.authService.logout(sessionToken);

    this.clearAuthCookies(response);
  }

  @Post('revoke-all-sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireReauthentication()
  @Throttle({
    default: {
      limit: RATE_LIMITS.CRITICAL.limit,
      ttl: RATE_LIMITS.CRITICAL.ttl,
    },
  })
  async revokeAllSessions(
    @Res({ passthrough: true })
    response: Response,
  ): Promise<void> {
    await this.authService.revokeAllSessions();

    this.clearAuthCookies(response);
  }

  private getSessionToken(request: Request): string {
    const cookieName = this.getSessionCookieName();

    const prefix = `${cookieName}=`;

    const token = (request.headers.cookie ?? '')
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    return token;
  }

  private getSessionCookieName(): string {
    return (
      this.configService.get<string>('auth.cookieName') ?? 'trading_session'
    );
  }

  private getSecureCookieSetting(): boolean {
    return this.configService.get<boolean>('auth.cookieSecure') ?? true;
  }

  private clearAuthCookies(response: Response): void {
    const secure = this.getSecureCookieSetting();

    response.clearCookie(this.getSessionCookieName(), {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
    });

    response.clearCookie('trading_csrf', {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      path: '/',
    });
  }
}
