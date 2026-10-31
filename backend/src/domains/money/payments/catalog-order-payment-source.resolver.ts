import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogOrderStatus, EscrowStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaymentSourceResolver,
  ResolvedPaymentSource,
} from './payment-source-resolver.interface';

@Injectable()
export class CatalogOrderPaymentSourceResolver implements PaymentSourceResolver {
  readonly sourceType = 'CATALOG_ORDER' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    sourceId: string,
    payerUserId: string
  ): Promise<ResolvedPaymentSource> {
    const order = await this.prisma.catalogOrder.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        requesterId: true,
        commerceId: true,
        commerceName: true,
        totalEstimate: true,
        status: true,
        escrowStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido de catálogo no encontrado');
    }
    if (!order.requesterId || order.requesterId !== payerUserId) {
      throw new BadRequestException(
        'Solo el comprador autenticado puede pagar este pedido'
      );
    }
    if (
      order.status === CatalogOrderStatus.CANCELLED ||
      order.status === CatalogOrderStatus.CLOSED
    ) {
      throw new BadRequestException('El pedido no admite pagos');
    }
    // Igual que ServiceRequestPaymentSourceResolver: un pedido que ya usa la
    // garantía interna (escrow) ya fue cobrado; pagarlo aparte lo cobraría dos veces.
    if (order.escrowStatus !== EscrowStatus.NONE) {
      throw new BadRequestException(
        'El pedido ya utiliza o utilizó el sistema de garantía interno'
      );
    }
    if (!order.totalEstimate || !order.totalEstimate.gt(0)) {
      throw new BadRequestException(
        'El pedido no tiene un importe válido para pagar'
      );
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { id: order.commerceId },
      select: {
        userId: true,
        settings: { select: { currency: true } },
      },
    });
    if (!commerce?.userId) {
      throw new NotFoundException('No se encontró el comercio del pedido');
    }

    // Legacy commerce settings default to MXN. Never reinterpret that amount
    // as VES or USD: unsupported currencies must fail closed.
    const currency = commerce.settings?.currency?.toUpperCase();
    if (currency !== 'VES' && currency !== 'USD') {
      throw new BadRequestException(
        'La moneda del comercio no está habilitada para pagos externos'
      );
    }

    return {
      sourceType: this.sourceType,
      sourceId: order.id,
      payerUserId,
      sellerUserId: commerce.userId,
      currency,
      baseAmount: order.totalEstimate.toFixed(2),
      description: `Pedido de catálogo - ${order.commerceName}`,
      quoteVersion: order.status,
    };
  }
}
