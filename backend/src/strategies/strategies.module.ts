import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { PrismaStrategyActivationRepository } from './prisma-strategy-activation.repository';
import { PrismaStrategySignalRepository } from './prisma-strategy-signal.repository';
import { PrismaStrategySymbolOverrideRepository } from './prisma-strategy-symbol-override.repository';
import { StrategyActivationService } from './strategy-activation.service';
import { STRATEGY_ACTIVATION_REPOSITORY } from './strategy-activation.repository';
import { StrategyRunnerService } from './strategy-runner.service';
import { StrategySignalPersistenceService } from './strategy-signal-persistence.service';
import { STRATEGY_SIGNAL_REPOSITORY } from './strategy-signal.repository';
import { STRATEGY_SYMBOL_OVERRIDE_REPOSITORY } from './strategy-symbol-override.repository';
import { StrategySymbolOverrideService } from './strategy-symbol-override.service';
import { StrategyValidationService } from './strategy-validation.service';

@Module({
  imports: [PrismaModule],
  providers: [
    StrategyValidationService,
    StrategyRunnerService,
    PrismaStrategyActivationRepository,
    {
      provide: STRATEGY_ACTIVATION_REPOSITORY,
      useExisting: PrismaStrategyActivationRepository,
    },
    StrategyActivationService,
    PrismaStrategySignalRepository,
    {
      provide: STRATEGY_SIGNAL_REPOSITORY,
      useExisting: PrismaStrategySignalRepository,
    },
    StrategySignalPersistenceService,
    PrismaStrategySymbolOverrideRepository,
    {
      provide: STRATEGY_SYMBOL_OVERRIDE_REPOSITORY,
      useExisting: PrismaStrategySymbolOverrideRepository,
    },
    StrategySymbolOverrideService,
  ],
  exports: [
    StrategyValidationService,
    StrategyRunnerService,
    StrategyActivationService,
    StrategySignalPersistenceService,
    StrategySymbolOverrideService,
  ],
})
export class StrategiesModule {}
