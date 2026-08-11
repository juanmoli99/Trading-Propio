import { SetMetadata } from '@nestjs/common';

export const REQUIRES_REAUTH_KEY = 'requiresReauthentication';

export const RequireReauthentication = () =>
  SetMetadata(REQUIRES_REAUTH_KEY, true);
