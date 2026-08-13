import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import alpacaLiveConfig from './alpaca-live.config';
import alpacaPaperConfig from './alpaca-paper.config';
import appConfig from './app.config';
import authConfig from './auth.config';
import corsConfig from './cors.config';
import databaseConfig from './database.config';
import earningsConfig from './earnings.config';
import hardCapsConfig from './hard-caps.config';
import finnhubConfig from './finnhub.config';
import marketDataConfig from './market-data.config';
import { validateEnvironment } from './env.validation';
import operationalConfig from './operational.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        corsConfig,
        operationalConfig,
        databaseConfig,
        earningsConfig,
        hardCapsConfig,
        finnhubConfig,
        marketDataConfig,
        alpacaPaperConfig,
        alpacaLiveConfig,
      ],
      validate: validateEnvironment,
    }),
  ],
})
export class AppConfigModule {}
