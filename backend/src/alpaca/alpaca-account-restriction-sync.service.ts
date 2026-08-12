import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AlpacaAccountService } from './alpaca-account.service';
import type { AlpacaAccount } from './alpaca-account.types';

@Injectable()
export class AlpacaAccountRestrictionSyncService {
  constructor(
    private readonly accountService: AlpacaAccountService,
    private readonly prisma: PrismaService,
  ) {}

  async syncFromAlpaca(): Promise<AlpacaAccount> {
    const account = await this.accountService.getAccount();

    const syncedAt = new Date();

    await this.prisma.alpacaAccountRestrictionSnapshot.upsert({
      where: {
        alpacaAccountId: account.id,
      },
      create: {
        alpacaAccountId: account.id,
        accountStatus: account.status,
        marginClassification: account.marginClassification,
        multiplier: Number(account.multiplier),

        tradingBlocked: account.restrictions.tradingBlocked,
        accountBlocked: account.restrictions.accountBlocked,
        transfersBlocked: account.restrictions.transfersBlocked,
        tradeSuspendedByUser: account.restrictions.tradeSuspendedByUser,
        shortingDisabled: account.restrictions.shortingDisabled,
        leverageDisabled: account.restrictions.leverageDisabled,

        tradingAllowed: account.capabilities.tradingAllowed,
        transfersAllowed: account.capabilities.transfersAllowed,
        shortingAllowed: account.capabilities.shortingAllowed,
        leverageAllowed: account.capabilities.leverageAllowed,

        buyingPower: account.buyingPower,
        regtBuyingPower: account.regtBuyingPower,
        nonMarginableBuyingPower: account.nonMarginableBuyingPower,

        initialMargin: account.initialMargin,
        maintenanceMargin: account.maintenanceMargin,
        lastMaintenanceMargin: account.lastMaintenanceMargin,
        sma: account.sma,

        syncedAt,
      },
      update: {
        accountStatus: account.status,
        marginClassification: account.marginClassification,
        multiplier: Number(account.multiplier),

        tradingBlocked: account.restrictions.tradingBlocked,
        accountBlocked: account.restrictions.accountBlocked,
        transfersBlocked: account.restrictions.transfersBlocked,
        tradeSuspendedByUser: account.restrictions.tradeSuspendedByUser,
        shortingDisabled: account.restrictions.shortingDisabled,
        leverageDisabled: account.restrictions.leverageDisabled,

        tradingAllowed: account.capabilities.tradingAllowed,
        transfersAllowed: account.capabilities.transfersAllowed,
        shortingAllowed: account.capabilities.shortingAllowed,
        leverageAllowed: account.capabilities.leverageAllowed,

        buyingPower: account.buyingPower,
        regtBuyingPower: account.regtBuyingPower,
        nonMarginableBuyingPower: account.nonMarginableBuyingPower,

        initialMargin: account.initialMargin,
        maintenanceMargin: account.maintenanceMargin,
        lastMaintenanceMargin: account.lastMaintenanceMargin,
        sma: account.sma,

        syncedAt,

        version: {
          increment: 1,
        },
      },
    });

    return account;
  }
}
