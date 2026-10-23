import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExternalCommissionCollectionMode,
  ExternalCommissionStatus,
  ExternalPaymentProvider,
  ExternalPaymentStatus,
  ExternalSettlementMode,
  FeePayer,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface PreparePaymentIntentInput {
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  payerUserId?: string;
  sellerUserId: string;
  provider: ExternalPaymentProvider;
  currency: 'VES' | 'USD';
  baseAmount: string;
  commissionRateBps: number;
  commissionPayer: FeePayer;
  settlementMode: ExternalSettlementMode;
  collectionMode: ExternalCommissionCollectionMode;
  metadata?: Prisma.InputJsonValue;
}

const FINAL_STATUSES = new Set<ExternalPaymentStatus>([
  ExternalPaymentStatus.FAILED,
  ExternalPaymentStatus.CANCELLED,
  ExternalPaymentStatus.EXPIRED,
  ExternalPaymentStatus.REFUNDED,
]);

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an internal quote only. The caller MUST authorize the source record
   * and calculate price/currency on the server. No provider checkout is created.
   */
  async prepareIntent(input: PreparePaymentIntentInput) {
    this.validateInput(input);
    const existing = await this.prisma.externalPaymentIntent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { commission: true },
    });
    if (existing) {
      const same =
        existing.sourceType === input.sourceType &&
        existing.sourceId === input.sourceId &&
        existing.sellerUserId === input.sellerUserId &&
        existing.provider === input.provider &&
        existing.currency === input.currency &&
        existing.baseAmount.equals(new Prisma.Decimal(input.baseAmount)) &&
        existing.commissionRateBps === input.commissionRateBps &&
        existing.commissionPayer === input.commissionPayer;
      if (!same) {
        throw new ConflictException(
          'La clave de idempotencia ya se usó con otros datos'
        );
      }
      return existing;
    }

    const base = new Prisma.Decimal(input.baseAmount).toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_UP
    );
    const fee = base
      .mul(input.commissionRateBps)
      .div(10000)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const amount =
      input.commissionPayer === FeePayer.CLIENT ? base.plus(fee) : base;
    const sellerNet =
      input.commissionPayer === FeePayer.PROVIDER ? base.minus(fee) : base;
    if (sellerNet.lt(0)) {
      throw new BadRequestException('La comisión supera el importe base');
    }

    return this.prisma.$transaction(async (tx) => {
      const intent = await tx.externalPaymentIntent.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          sourceType: input.sourceType.trim(),
          sourceId: input.sourceId.trim(),
          payerUserId: input.payerUserId,
          sellerUserId: input.sellerUserId,
          provider: input.provider,
          status: ExternalPaymentStatus.DRAFT,
          currency: input.currency,
          baseAmount: base,
          amount,
          commissionAmount: fee,
          sellerNetAmount: sellerNet,
          commissionRateBps: input.commissionRateBps,
          commissionPayer: input.commissionPayer,
          settlementMode: input.settlementMode,
          collectionMode: input.collectionMode,
          metadata: input.metadata,
        },
      });
      await tx.externalPaymentCommission.create({
        data: {
          paymentIntentId: intent.id,
          sellerUserId: input.sellerUserId,
          currency: input.currency,
          baseAmount: base,
          feeAmount: fee,
          sellerNetAmount: sellerNet,
          rateBps: input.commissionRateBps,
          payer: input.commissionPayer,
          collectionMode: input.collectionMode,
          status: ExternalCommissionStatus.PENDING,
        },
      });
      return tx.externalPaymentIntent.findUniqueOrThrow({
        where: { id: intent.id },
        include: { commission: true },
      });
    });
  }

  async getIntentForUser(id: string, userId: string) {
    const intent = await this.prisma.externalPaymentIntent.findFirst({
      where: { id, OR: [{ payerUserId: userId }, { sellerUserId: userId }] },
      include: { commission: true, refunds: true, settlements: true },
    });
    if (!intent) throw new NotFoundException('Pago no encontrado');
    return intent;
  }

  /** Call only after a provider-specific adapter verifies the actual signature. */
  async recordVerifiedWebhook(input: {
    provider: ExternalPaymentProvider;
    providerEventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
    signatureVerified: true;
  }) {
    if (!input.providerEventId?.trim() || !input.eventType?.trim()) {
      throw new BadRequestException('Evento de proveedor incompleto');
    }
    try {
      return await this.prisma.externalPaymentWebhookEvent.create({
        data: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          signatureVerified: true,
          status: 'RECEIVED',
          payload: input.payload,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.externalPaymentWebhookEvent.findUnique({
          where: {
            provider_providerEventId: {
              provider: input.provider,
              providerEventId: input.providerEventId,
            },
          },
        });
      }
      throw error;
    }
  }

  /** Provider states must be normalized before calling; terminal states resist late webhooks. */
  async transitionIntent(
    id: string,
    nextStatus: ExternalPaymentStatus,
    providerStatus?: string,
    failureCode?: string,
    failureMessage?: string
  ) {
    const current = await this.prisma.externalPaymentIntent.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Pago no encontrado');
    if (current.status === nextStatus) return current;
    if (FINAL_STATUSES.has(current.status)) {
      throw new ConflictException(
        'No se puede sobrescribir un estado terminal del pago'
      );
    }

    const allowed: Record<ExternalPaymentStatus, ExternalPaymentStatus[]> = {
      DRAFT: [
        'REQUIRES_ACTION',
        'PENDING',
        'PROCESSING',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
      ],
      REQUIRES_ACTION: [
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REQUIRES_RECONCILIATION',
      ],
      PENDING: [
        'REQUIRES_ACTION',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REQUIRES_RECONCILIATION',
      ],
      PROCESSING: [
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REQUIRES_RECONCILIATION',
      ],
      REQUIRES_RECONCILIATION: [
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
      ],
      SUCCEEDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
      PARTIALLY_REFUNDED: ['REFUNDED'],
      FAILED: [],
      CANCELLED: [],
      EXPIRED: [],
      REFUNDED: [],
    };
    if (!allowed[current.status].includes(nextStatus)) {
      throw new ConflictException(
        'Transición de pago no permitida: ' +
          current.status +
          ' -> ' +
          nextStatus
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Compare-and-swap protects against concurrent/out-of-order webhook workers.
      const changed = await tx.externalPaymentIntent.updateMany({
        where: { id, status: current.status },
        data: {
          status: nextStatus,
          providerStatus,
          failureCode,
          failureMessage,
          succeededAt:
            nextStatus === ExternalPaymentStatus.SUCCEEDED
              ? new Date()
              : undefined,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'El estado del pago cambió en paralelo; debe reconciliarse'
        );
      }
      const updated = await tx.externalPaymentIntent.findUniqueOrThrow({
        where: { id },
      });
      if (nextStatus === ExternalPaymentStatus.SUCCEEDED) {
        await tx.externalPaymentCommission.updateMany({
          where: {
            paymentIntentId: id,
            status: ExternalCommissionStatus.PENDING,
          },
          data: { status: ExternalCommissionStatus.EARNED },
        });
      } else if (
        nextStatus === ExternalPaymentStatus.FAILED ||
        nextStatus === ExternalPaymentStatus.CANCELLED ||
        nextStatus === ExternalPaymentStatus.EXPIRED
      ) {
        await tx.externalPaymentCommission.updateMany({
          where: {
            paymentIntentId: id,
            status: ExternalCommissionStatus.PENDING,
          },
          data: {
            status: ExternalCommissionStatus.REVERSED,
            reversedAt: new Date(),
          },
        });
      }
      return updated;
    });
  }

  private validateInput(input: PreparePaymentIntentInput) {
    if (!input.idempotencyKey?.trim() || input.idempotencyKey.length > 200) {
      throw new BadRequestException(
        'La clave de idempotencia es obligatoria (máximo 200 caracteres)'
      );
    }
    if (
      !input.sourceType?.trim() ||
      !input.sourceId?.trim() ||
      !input.sellerUserId?.trim()
    ) {
      throw new BadRequestException(
        'La referencia de origen y el proveedor son obligatorios'
      );
    }
    if (input.currency !== 'VES' && input.currency !== 'USD') {
      throw new BadRequestException('Moneda no admitida; use VES o USD');
    }
    let amount: Prisma.Decimal;
    try {
      amount = new Prisma.Decimal(input.baseAmount);
    } catch {
      throw new BadRequestException('Importe base inválido');
    }
    if (!amount.isFinite() || !amount.gt(0) || amount.decimalPlaces() > 2) {
      throw new BadRequestException(
        'El importe debe ser positivo y tener máximo 2 decimales'
      );
    }
    if (
      !Number.isInteger(input.commissionRateBps) ||
      input.commissionRateBps < 0 ||
      input.commissionRateBps > 10000
    ) {
      throw new BadRequestException(
        'La comisión debe estar entre 0 y 10000 puntos básicos'
      );
    }
    if (
      input.settlementMode === ExternalSettlementMode.PROVIDER_SPLIT &&
      input.collectionMode !== ExternalCommissionCollectionMode.AUTOMATIC_SPLIT
    ) {
      throw new BadRequestException(
        'El split del proveedor requiere cobro automático de comisión'
      );
    }
    if (
      input.settlementMode !== ExternalSettlementMode.PROVIDER_SPLIT &&
      input.collectionMode === ExternalCommissionCollectionMode.AUTOMATIC_SPLIT
    ) {
      throw new BadRequestException(
        'El cobro automático requiere split habilitado por el proveedor'
      );
    }
  }
}
