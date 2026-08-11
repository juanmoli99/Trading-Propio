import { registerAs } from '@nestjs/config';

export interface AuthConfiguration {
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlMinutes: number;
}

export default registerAs('auth', (): AuthConfiguration => ({
  cookieName: 'trading_session',
  cookieSecure: process.env.NODE_ENV !== 'development',
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES ?? 720),
}));
