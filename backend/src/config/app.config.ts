import { registerAs } from '@nestjs/config';
import type {
  BaseCurrency,
  EnvironmentName,
  TradingMode,
} from './env.validation';

export interface AppConfiguration {
  name: string;
  environment: EnvironmentName;
  tradingMode: TradingMode;
  baseCurrency: BaseCurrency;
  port: number;
  timeZone: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isPaper: boolean;
  isLive: boolean;
  liveTradingEnabled: boolean;
}

export default registerAs('app', (): AppConfiguration => {
  const environment = (process.env.NODE_ENV ??
    'development') as EnvironmentName;

  const tradingMode = (process.env.TRADING_MODE ?? 'PAPER') as TradingMode;

  const baseCurrency = (process.env.BASE_CURRENCY ?? 'USD') as BaseCurrency;

  return {
    name: 'trading-backend',
    environment,
    tradingMode,
    baseCurrency,
    port: Number(process.env.PORT ?? 3000),
    timeZone: process.env.APP_TIMEZONE ?? 'UTC',
    isDevelopment: environment === 'development',
    isStaging: environment === 'staging',
    isProduction: environment === 'production',
    isPaper: tradingMode === 'PAPER',
    isLive: tradingMode === 'LIVE',
    liveTradingEnabled:
      tradingMode === 'LIVE' &&
      environment === 'production' &&
      process.env.ENABLE_LIVE_TRADING === 'true',
  };
});
