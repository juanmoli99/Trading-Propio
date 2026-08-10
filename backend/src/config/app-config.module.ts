import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import alpacaLiveConfig from './alpaca-live.config';
import alpacaPaperConfig from './alpaca-paper.config';
import appConfig from './app.config';
import { validateEnvironment } from './env.validation';
import operationalConfig from './operational.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, operationalConfig, alpacaPaperConfig, alpacaLiveConfig],
      validate: validateEnvironment,
    }),
  ],
})
export class AppConfigModule {}
