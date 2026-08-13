import { Module } from '@nestjs/common';
import { AdxService } from './adx.service';
import { AtrService } from './atr.service';
import { AverageVolumeService } from './average-volume.service';
import { BollingerBandsService } from './bollinger-bands.service';
import { CrossoverService } from './crossover.service';
import { CustomIndicatorRegistryService } from './custom-indicator-registry.service';
import { EmaService } from './ema.service';
import { MacdService } from './macd.service';
import { ReturnsService } from './returns.service';
import { RollingHighLowService } from './rolling-high-low.service';
import { RsiService } from './rsi.service';
import { SmaService } from './sma.service';
import { VolatilityService } from './volatility.service';
import { VwapService } from './vwap.service';

@Module({
  providers: [
    AtrService,
    BollingerBandsService,
    EmaService,
    MacdService,
    RsiService,
    SmaService,
  ],
  exports: [
    AtrService,
    BollingerBandsService,
    EmaService,
    MacdService,
    RsiService,
    SmaService,
  ],
})
export class IndicatorsModule {}
