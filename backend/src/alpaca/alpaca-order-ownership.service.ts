import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AlpacaOrder } from './alpaca-order.types';

@Injectable()
export class AlpacaOrderOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPlatformOrder(order: AlpacaOrder): Promise<void> {
    await this.prisma.platformAlpacaOrder.upsert({
      where: {
        alpacaOrderId: order.id,
      },
      create: {
        alpacaOrderId: order.id,
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
      },
      update: {
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
      },
    });
  }

  async isPlatformOrder(alpacaOrderId: string): Promise<boolean> {
    const normalizedOrderId = alpacaOrderId.trim();

    if (!normalizedOrderId) {
      throw new Error('Alpaca order ID is required');
    }

    const order = await this.prisma.platformAlpacaOrder.findUnique({
      where: {
        alpacaOrderId: normalizedOrderId,
      },
      select: {
        id: true,
      },
    });

    return order !== null;
  }
}
