import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AlpacaAccount } from '../alpaca/alpaca-account.types';
import { RegulatoryRulesService } from './regulatory-rules.service';

@Injectable()
export class RegulatoryAccountConsistencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly regulatoryRulesService: RegulatoryRulesService,
  ) {}

  async assertConsistent(account: AlpacaAccount): Promise<void> {
    await this.assertRegulatoryPolicy();

    this.assertDerivedAccountValues(account);

    const snapshot =
      await this.prisma.alpacaAccountRestrictionSnapshot.findUnique({
        where: {
          alpacaAccountId: account.id,
        },
      });

    if (!snapshot) {
      throw new Error(
        'Regulatory consistency check failed: local Alpaca account snapshot is missing',
      );
    }

    const mismatches: string[] = [];

    this.compare(
      mismatches,
      'accountStatus',
      snapshot.accountStatus,
      account.status,
    );

    this.compare(
      mismatches,
      'marginClassification',
      snapshot.marginClassification,
      account.marginClassification,
    );

    this.compare(
      mismatches,
      'multiplier',
      snapshot.multiplier,
      Number(account.multiplier),
    );

    this.compare(
      mismatches,
      'tradingBlocked',
      snapshot.tradingBlocked,
      account.restrictions.tradingBlocked,
    );

    this.compare(
      mismatches,
      'accountBlocked',
      snapshot.accountBlocked,
      account.restrictions.accountBlocked,
    );

    this.compare(
      mismatches,
      'transfersBlocked',
      snapshot.transfersBlocked,
      account.restrictions.transfersBlocked,
    );

    this.compare(
      mismatches,
      'tradeSuspendedByUser',
      snapshot.tradeSuspendedByUser,
      account.restrictions.tradeSuspendedByUser,
    );

    this.compare(
      mismatches,
      'shortingDisabled',
      snapshot.shortingDisabled,
      account.restrictions.shortingDisabled,
    );

    this.compare(
      mismatches,
      'leverageDisabled',
      snapshot.leverageDisabled,
      account.restrictions.leverageDisabled,
    );

    this.compare(
      mismatches,
      'tradingAllowed',
      snapshot.tradingAllowed,
      account.capabilities.tradingAllowed,
    );

    this.compare(
      mismatches,
      'transfersAllowed',
      snapshot.transfersAllowed,
      account.capabilities.transfersAllowed,
    );

    this.compare(
      mismatches,
      'shortingAllowed',
      snapshot.shortingAllowed,
      account.capabilities.shortingAllowed,
    );

    this.compare(
      mismatches,
      'leverageAllowed',
      snapshot.leverageAllowed,
      account.capabilities.leverageAllowed,
    );

    this.compareDecimal(
      mismatches,
      'buyingPower',
      snapshot.buyingPower.toString(),
      account.buyingPower,
    );

    this.compareDecimal(
      mismatches,
      'regtBuyingPower',
      snapshot.regtBuyingPower.toString(),
      account.regtBuyingPower,
    );

    this.compareDecimal(
      mismatches,
      'nonMarginableBuyingPower',
      snapshot.nonMarginableBuyingPower.toString(),
      account.nonMarginableBuyingPower,
    );

    this.compareDecimal(
      mismatches,
      'initialMargin',
      snapshot.initialMargin.toString(),
      account.initialMargin,
    );

    this.compareDecimal(
      mismatches,
      'maintenanceMargin',
      snapshot.maintenanceMargin.toString(),
      account.maintenanceMargin,
    );

    this.compareDecimal(
      mismatches,
      'lastMaintenanceMargin',
      snapshot.lastMaintenanceMargin.toString(),
      account.lastMaintenanceMargin,
    );

    this.compareDecimal(
      mismatches,
      'sma',
      snapshot.sma.toString(),
      account.sma,
    );

    if (mismatches.length > 0) {
      throw new Error(
        `Regulatory account mismatch with Alpaca: ${mismatches.join(', ')}`,
      );
    }
  }

  private async assertRegulatoryPolicy(): Promise<void> {
    const current = await this.regulatoryRulesService.getCurrent();

    if (current.rules.mismatchPolicy !== 'BLOCK') {
      throw new Error(
        'Regulatory consistency check requires BLOCK mismatch policy',
      );
    }

    if (
      !current.rules.intradayMargin.enabled ||
      !current.rules.intradayMargin.brokerBuyingPowerAuthoritative ||
      !current.rules.intradayMargin.brokerRestrictionsAuthoritative
    ) {
      throw new Error(
        'Regulatory consistency configuration is not safe for trading',
      );
    }
  }

  private assertDerivedAccountValues(account: AlpacaAccount): void {
    const multiplier = Number(account.multiplier);

    const expectedClassification = this.classifyMultiplier(multiplier);

    if (account.marginClassification !== expectedClassification) {
      throw new Error(
        'Regulatory local calculation differs from Alpaca margin classification',
      );
    }

    const expectedTradingAllowed =
      account.status === 'ACTIVE' &&
      !account.tradingBlocked &&
      !account.accountBlocked &&
      !account.tradeSuspendedByUser;

    const expectedTransfersAllowed =
      account.status === 'ACTIVE' &&
      !account.accountBlocked &&
      !account.transfersBlocked;

    const expectedLeverageAllowed = multiplier > 1;

    const expectedShortingAllowed =
      expectedTradingAllowed &&
      account.shortingEnabled &&
      expectedLeverageAllowed;

    if (
      account.capabilities.tradingAllowed !== expectedTradingAllowed ||
      account.capabilities.transfersAllowed !== expectedTransfersAllowed ||
      account.capabilities.leverageAllowed !== expectedLeverageAllowed ||
      account.capabilities.shortingAllowed !== expectedShortingAllowed
    ) {
      throw new Error(
        'Regulatory local capability calculation differs from Alpaca account state',
      );
    }

    if (
      account.restrictions.shortingDisabled !== !account.shortingEnabled ||
      account.restrictions.leverageDisabled !== !expectedLeverageAllowed
    ) {
      throw new Error(
        'Regulatory local restriction calculation differs from Alpaca account state',
      );
    }

    if (
      !this.decimalsEqual(
        account.buyingPowerSummary.effective,
        account.buyingPower,
      ) ||
      !this.decimalsEqual(
        account.buyingPowerSummary.regT,
        account.regtBuyingPower,
      ) ||
      !this.decimalsEqual(
        account.buyingPowerSummary.nonMarginable,
        account.nonMarginableBuyingPower,
      ) ||
      account.buyingPowerSummary.intradayMultiplier !== multiplier
    ) {
      throw new Error(
        'Regulatory local buying power summary differs from Alpaca account state',
      );
    }
  }

  private classifyMultiplier(
    multiplier: number,
  ): AlpacaAccount['marginClassification'] {
    switch (multiplier) {
      case 1:
        return 'LIMITED_MARGIN_1X';

      case 2:
        return 'REG_T_MARGIN_2X';

      case 4:
        return 'INTRADAY_MARGIN_4X';

      default:
        throw new Error(`Unsupported Alpaca margin multiplier: ${multiplier}`);
    }
  }

  private compare(
    mismatches: string[],
    field: string,
    localValue: unknown,
    brokerValue: unknown,
  ): void {
    if (localValue !== brokerValue) {
      mismatches.push(field);
    }
  }

  private compareDecimal(
    mismatches: string[],
    field: string,
    localValue: string,
    brokerValue: string,
  ): void {
    if (!this.decimalsEqual(localValue, brokerValue)) {
      mismatches.push(field);
    }
  }

  private decimalsEqual(first: string, second: string): boolean {
    const firstNumber = Number(first);
    const secondNumber = Number(second);

    if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
      return false;
    }

    return firstNumber === secondNumber;
  }
}
