import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { VerifiedProviderEvent } from './payment-provider.interface';

/**
 * Processes only events already authenticated and normalized by a provider adapter.
 * This class deliberately does not expose a public webhook route or move funds:
 * a provider-specific adapter and its signature contract must exist first.
 */
@Injectable()
export class ProviderWebhookProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService
  ) {}

  async process(event: VerifiedProviderEvent) {
    if (event.signatureVerified !== true) {
      throw new ConflictException('El evento del proveedor no está verificado');
    }
    if (!event.providerEventId?.trim() || !event.eventType?.trim()) {
      throw new ConflictException('Evento de proveedor incompleto');
    }

    const recorded = await this.paymentsService.recordVerifiedWebhook({
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      signatureVerified: true,
    });

    if (!recorded) {
      throw new ConflictException('No se pudo registrar el evento del proveedor');
    }
    if (recorded.status === 'PROCESSED' || recorded.status === 'IGNORED') {
      return recorded;
    }

    const markIgnored = (reason: string) =>
      this.prisma.externalPaymentWebhookEvent.update({
        where: { id: recorded.id },
        data: {
          status: 'IGNORED',
          processingError: reason,
          processedAt: new Date(),
        },
      });

    const lookup = this.buildIntentLookup(event);
    if (!lookup) {
      return markIgnored('El evento no contiene una referencia de pago reconocible');
    }

    const intent = await this.prisma.externalPaymentIntent.findFirst({
      where: { provider: event.provider, ...lookup },
    });
    if (!intent) {
      // Do not acknowledge an unknown event as a successful payment. Keep it
      // auditable, but do not retry indefinitely for an unrelated reference.
      return markIgnored('No existe un pago asociado a la referencia del evento');
    }

    if (!event.status) {
      return markIgnored('El adaptador no pudo normalizar el estado del evento');
    }

    try {
      await this.paymentsService.transitionIntent(
        intent.id,
        event.status,
        event.eventType
      );
      return await this.prisma.externalPaymentWebhookEvent.update({
        where: { id: recorded.id },
        data: {
          status: 'PROCESSED',
          processingError: null,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        // Invalid/out-of-order transitions are not retried forever. The event
        // remains in the audit trail for a reconciliation operator.
        return markIgnored('Transición de pago no permitida; requiere reconciliación');
      }

      await this.prisma.externalPaymentWebhookEvent.update({
        where: { id: recorded.id },
        data: {
          status: 'FAILED',
          processingError: 'Error interno al procesar el evento',
        },
      });
      throw error;
    }
  }

  private buildIntentLookup(
    event: VerifiedProviderEvent
  ): { id: string } | { providerPaymentId: string } | null {
    if (event.paymentIntentId?.trim()) return { id: event.paymentIntentId };
    if (event.providerPaymentId?.trim()) {
      return { providerPaymentId: event.providerPaymentId };
    }
    return null;
  }
}
