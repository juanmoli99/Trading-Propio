import { Injectable } from '@nestjs/common';
import { RegulatoryAccountConsistencyService } from '../regulatory/regulatory-account-consistency.service';
import { AlpacaAccountRestrictionSyncService } from './alpaca-account-restriction-sync.service';
import { AlpacaAssetService } from './alpaca-asset.service';
import { AlpacaPositionService } from './alpaca-position.service';
import type { AlpacaSubmitOrderRequest } from './alpaca-submit-order.types';

@Injectable()
export class AlpacaAccountRestrictionGuardService {
  constructor(
    private readonly restrictionSyncService: AlpacaAccountRestrictionSyncService,
    private readonly regulatoryConsistencyService: RegulatoryAccountConsistencyService,
    private readonly assetService: AlpacaAssetService,
    private readonly positionService: AlpacaPositionService,
  ) {}

  async validateOrder(request: AlpacaSubmitOrderRequest): Promise<void> {
    const symbol = request.symbol.trim().toUpperCase();

    const [account, asset, positions] = await Promise.all([
      this.restrictionSyncService.syncFromAlpaca(),
      this.assetService.getAsset(symbol),
      this.positionService.getPositions(),
    ]);

    await this.regulatoryConsistencyService.assertConsistent(account);

    if (!account.capabilities.tradingAllowed) {
      throw new Error('Alpaca account does not currently allow trading');
    }

    if (asset.status !== 'active') {
      throw new Error(`Alpaca asset is not active: ${symbol}`);
    }

    if (!asset.tradable) {
      throw new Error(`Alpaca asset is not tradable: ${symbol}`);
    }

    if (
      request.quantity !== undefined &&
      this.isFractional(request.quantity) &&
      !asset.fractionable
    ) {
      throw new Error(
        `Alpaca asset does not allow fractional trading: ${symbol}`,
      );
    }

    if (request.side !== 'sell') {
      return;
    }

    const position = positions.find(
      (item) => item.symbol.trim().toUpperCase() === symbol,
    );

    if (
      !this.canOrderOpenOrIncreaseShort(
        request,
        position?.side,
        position?.quantity,
      )
    ) {
      return;
    }

    if (!account.capabilities.shortingAllowed) {
      throw new Error('Alpaca account does not currently allow short selling');
    }

    if (!asset.shortable) {
      throw new Error(`Alpaca asset is not shortable: ${symbol}`);
    }

    if (!asset.easyToBorrow) {
      throw new Error(
        `Alpaca asset is not currently easy to borrow: ${symbol}`,
      );
    }
  }

  private canOrderOpenOrIncreaseShort(
    request: AlpacaSubmitOrderRequest,
    positionSide: string | undefined,
    positionQuantity: string | undefined,
  ): boolean {
    if (positionSide === 'short') {
      return true;
    }

    if (positionSide !== 'long' || positionQuantity === undefined) {
      return true;
    }

    if (request.quantity === undefined) {
      return true;
    }

    const orderQuantity = Number(request.quantity);

    const longQuantity = Math.abs(Number(positionQuantity));

    if (!Number.isFinite(orderQuantity) || !Number.isFinite(longQuantity)) {
      throw new Error('Unable to validate Alpaca position quantity');
    }

    return orderQuantity > longQuantity;
  }

  private isFractional(value: string): boolean {
    return !Number.isInteger(Number(value));
  }
}
