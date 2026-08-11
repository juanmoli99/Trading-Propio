import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AUTHENTICATED_PRINCIPAL,
  type AuthenticatedPrincipal,
} from './authenticated-principal';

type AuthenticatedRequest = Request & {
  [AUTHENTICATED_PRINCIPAL]?: AuthenticatedPrincipal;
};

export const CurrentOperator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const principal = request[AUTHENTICATED_PRINCIPAL];

    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }

    return principal;
  },
);
