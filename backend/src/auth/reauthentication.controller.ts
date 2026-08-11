import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { RATE_LIMITS } from '../common/security/rate-limit.constants';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  type ReauthenticateInput,
  reauthenticateSchema,
} from './reauthenticate.schema';
import { ReauthenticationService } from './reauthentication.service';

@Controller('auth')
export class ReauthenticationController {
  constructor(
    private readonly reauthenticationService: ReauthenticationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('reauthenticate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    default: {
      limit: RATE_LIMITS.CRITICAL.limit,
      ttl: RATE_LIMITS.CRITICAL.ttl,
    },
  })
  async reauthenticate(
    @Req() request: Request,
    @Body(new ZodValidationPipe(reauthenticateSchema))
    body: ReauthenticateInput,
  ): Promise<void> {
    const cookieName =
      this.configService.get<string>('auth.cookieName') ?? 'trading_session';

    const sessionToken = this.readCookie(
      request.headers.cookie ?? '',
      cookieName,
    );

    if (!sessionToken) {
      return;
    }

    await this.reauthenticationService.reauthenticate(
      sessionToken,
      body.password,
    );
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
