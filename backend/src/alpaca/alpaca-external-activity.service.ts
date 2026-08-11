import { Injectable } from '@nestjs/common';
import type { AlpacaOrder } from './alpaca-order.types';
import { AlpacaOrderOwnershipService } from './alpaca-order-ownership.service';
import { AlpacaOrderService } from './alpaca-order.service';

export interface AlpacaExternalOrderDetectionResult {
  readonly checkedOrders: number;
  readonly platformOrders: AlpacaOrder[];
  readonly externalOrders: AlpacaOrder[];
}

@Injectable()
export class AlpacaExternalActivityService {
  constructor(
    private readonly orderService: AlpacaOrderService,
    private readonly ownershipService: AlpacaOrderOwnershipService,
  ) {}

  async detectExternalOrders(): Promise<AlpacaExternalOrderDetectionResult> {
    const orders = await this.orderService.getOrders({
      status: 'all',
      limit: 500,
      direction: 'desc',
    });

    const platformOrders: AlpacaOrder[] = [];
    const externalOrders: AlpacaOrder[] = [];

    for (const order of orders) {
      const isPlatformOrder = await this.ownershipService.isPlatformOrder(
        order.id,
      );

      if (isPlatformOrder) {
        platformOrders.push(order);
      } else {
        externalOrders.push(order);
      }
    }

    return {
      checkedOrders: orders.length,
      platformOrders,
      externalOrders,
    };
  }
}
