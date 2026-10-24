import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscrowStatus, ServiceRequestStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaymentSourceResolver,
  ResolvedPaymentSource,
} from './payment-source-resolver.interface';

@Injectable()
export class ServiceRequestPaymentSourceResolver implements PaymentSourceResolver {
  readonly sourceType = 'SERVICE_REQUEST' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    sourceId: string,
    payerUserId: string
  ): Promise<ResolvedPaymentSource> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        requesterId: true,
        providerId: true,
        serviceId: true,
        serviceName: true,
        price: true,
        status: true,
        escrowStatus: true,
        updatedAt: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }
    if (!request.requesterId || request.requesterId !== payerUserId) {
      throw new BadRequestException(
        'Solo el cliente autenticado puede pagar esta solicitud'
      );
    }
    if (request.status !== ServiceRequestStatus.CONTACTED) {
      throw new BadRequestException(
        'La solicitud debe tener precio acordado para admitir el pago'
      );
    }
    // This resolver is only for direct/external payment preparation. Requests
    // already using the internal wallet escrow must never be charged twice.
    if (request.escrowStatus !== EscrowStatus.NONE) {
      throw new BadRequestException(
        'La solicitud ya utiliza o utilizó el sistema de garantía interno'
      );
    }
    if (!request.price || !request.price.gt(0)) {
      throw new BadRequestException(
        'La solicitud no tiene un precio positivo confirmado'
      );
    }

    const service = await this.prisma.service.findUnique({
      where: { id: request.serviceId },
      select: { userId: true },
    });
    if (!service || service.userId !== request.providerId) {
      throw new BadRequestException(
        'El proveedor de la solicitud no coincide con el servicio registrado'
      );
    }

    const [commerce, freelancerSettings] = await Promise.all([
      this.prisma.commerce.findFirst({
        where: { userId: service.userId },
        select: { settings: { select: { currency: true } } },
      }),
      this.prisma.freelancerSettings.findUnique({
        where: { userId: service.userId },
        select: { currency: true },
      }),
    ]);

    const currencies = [
      commerce?.settings?.currency?.toUpperCase(),
      freelancerSettings?.currency?.toUpperCase(),
    ].filter((value): value is string => Boolean(value));

    if (
      currencies.length === 0 ||
      currencies.some((currency) => currency !== currencies[0]) ||
      (currencies[0] !== 'VES' && currencies[0] !== 'USD')
    ) {
      throw new BadRequestException(
        'La moneda del proveedor no está configurada de forma válida para pagos externos'
      );
    }

    return {
      sourceType: this.sourceType,
      sourceId: request.id,
      payerUserId,
      sellerUserId: service.userId,
      currency: currencies[0],
      baseAmount: request.price.toFixed(2),
      description: `Servicio - ${request.serviceName}`,
      quoteVersion: request.updatedAt.toISOString(),
    };
  }
}
