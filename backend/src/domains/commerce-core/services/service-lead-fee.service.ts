import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PLATFORM_FEES_FACADE,
  type PlatformFeesFacade,
} from '../../money/platform-fees/platform-fees.facade';
import {
  InsufficientUsageCreditsError,
  USAGE_CREDITS_FACADE,
  type UsageCreditsFacade,
} from '../../money/usage-credits/usage-credits.facade';
import {
  LEAD_FEE_POLICY_VERSION,
  leadFeeUnits,
} from '../../money/usage-credits/usage-credits.constants';

const dec = (v: Prisma.Decimal | number | string | null | undefined) =>
  new Prisma.Decimal(v ?? 0).toDecimalPlaces(2);

export const leadFeeReference = (serviceRequestId: string) =>
  `LEAD-SVC-${serviceRequestId}`;
export const successFeeCreditReference = (serviceRequestId: string) =>
  `SUCCESS-SVC-${serviceRequestId}`;

export interface LeadFeeQuote {
  serviceRequestId: string;
  status: 'PENDING' | 'SEEN';
  policyVersion: string;
  /** Precio con el que se calcula (de la solicitud o, si no hay, el del servicio). */
  basePrice: number | null;
  leadFee: number;
  commissionRate: number | null;
  /** Comisión estimada; la real se descuenta al cerrar, con el precio final. */
  estimatedCommission: number;
  total: number;
  available: number;
  enough: boolean;
}

/**
 * Cobro en créditos de uso al aceptar una solicitud de servicio (apagado
 * con USAGE_CREDITS_ENABLED hasta el dictamen legal):
 *
 * 1. El proveedor pide la cotización: cargo por oportunidad + comisión
 *    estimada, y su saldo de créditos.
 * 2. Acepta explícitamente esa cotización (versión de política e importe):
 *    en UNA transacción se reclama la solicitud (PENDING/SEEN → CONTACTED),
 *    se guarda el consentimiento y se descuenta el cargo en créditos. Si
 *    algo falla, no queda ni aceptación sin cargo ni cargo sin aceptación.
 * 3. Al cerrar, la comisión real se descuenta en créditos
 *    (chargeSuccessFeeInCredits). Sin saldo suficiente en ese momento, cae al
 *    estado de cuenta semanal: no se le puede bloquear el cierre al cliente.
 *
 * Ver docs/MARKETPLACE_CREDIT_MONETIZATION_REVIEW.md (secciones 2.3 y 8).
 */
@Injectable()
export class ServiceLeadFeeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_FEES_FACADE)
    private readonly platformFees: PlatformFeesFacade,
    @Inject(USAGE_CREDITS_FACADE)
    private readonly credits: UsageCreditsFacade
  ) {}

  isEnabled() {
    return this.credits.isEnabled();
  }

  private assertEnabled() {
    if (!this.isEnabled()) {
      throw new NotFoundException('Los créditos de uso no están disponibles');
    }
  }

  async quote(id: string, providerId: string): Promise<LeadFeeQuote> {
    this.assertEnabled();
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        status: true,
        price: true,
        platformFeePayer: true,
        platformFeeAmount: true,
        service: { select: { price: true } },
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== providerId) {
      throw new ForbiddenException('No tienes permiso');
    }
    if (req.status !== 'PENDING' && req.status !== 'SEEN') {
      throw new ConflictException('Esta solicitud ya no se puede aceptar');
    }

    const basePrice = req.price ?? req.service?.price ?? null;
    const leadFee = leadFeeUnits(basePrice);

    // Comisión: si la paga el cliente y ya hay precio, es la que se sumó al
    // precio; si la paga el proveedor, la tasa sobre el precio conocido.
    let commissionRate: Prisma.Decimal | null = null;
    let estimatedCommission = dec(0);
    if (req.platformFeePayer === 'CLIENT' && req.platformFeeAmount) {
      estimatedCommission = dec(req.platformFeeAmount);
    } else {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'SERVICE_REQUEST',
        providerId
      );
      if (feeConfig) {
        commissionRate = new Prisma.Decimal(feeConfig.rate);
        if (basePrice && dec(basePrice).gt(0)) {
          estimatedCommission = dec(
            this.platformFees.calculateFee(basePrice, feeConfig).feeAmount
          );
        }
      }
    }

    const total = leadFee.plus(estimatedCommission);
    const available = await this.credits.getAvailable(providerId);
    return {
      serviceRequestId: id,
      status: req.status,
      policyVersion: LEAD_FEE_POLICY_VERSION,
      basePrice: basePrice === null ? null : dec(basePrice).toNumber(),
      leadFee: leadFee.toNumber(),
      commissionRate: commissionRate?.toNumber() ?? null,
      estimatedCommission: estimatedCommission.toNumber(),
      total: total.toNumber(),
      available: dec(available).toNumber(),
      enough: dec(available).gte(total),
    };
  }

  /**
   * Acepta la solicitud y descuenta el cargo por oportunidad. `presented` es
   * lo que el proveedor vio: si la política o el importe cambiaron desde la
   * cotización, se rechaza para que vuelva a verlo antes de aceptar.
   */
  async accept(
    id: string,
    providerId: string,
    presented: { policyVersion: string; leadFee: number }
  ) {
    const quote = await this.quote(id, providerId);
    if (
      presented.policyVersion !== quote.policyVersion ||
      !dec(presented.leadFee).eq(dec(quote.leadFee))
    ) {
      throw new ConflictException({
        message:
          'El cargo cambió. Revisa el importe actualizado y acepta de nuevo.',
        errorCode: 'LEAD_FEE_QUOTE_CHANGED',
        quote,
      });
    }
    if (!quote.enough) {
      throw new BadRequestException({
        message: `Necesitas ${quote.total} créditos (cargo por oportunidad + comisión estimada) y tienes ${quote.available}. Compra créditos para aceptar.`,
        errorCode: 'USAGE_CREDITS_INSUFFICIENT',
        quote,
      });
    }

    const reference = leadFeeReference(id);
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Reclamo atómico: dos aceptaciones simultáneas (o un PATCH que
        // rechaza a la vez) no pueden pasar las dos.
        const claimed = await tx.serviceRequest.updateMany({
          where: { id, providerId, status: { in: ['PENDING', 'SEEN'] } },
          data: { status: 'CONTACTED', statusUpdatedAt: now },
        });
        if (claimed.count === 0) {
          throw new ConflictException('Esta solicitud ya no se puede aceptar');
        }
        await tx.serviceRequestStatusHistory.create({
          data: {
            serviceRequestId: id,
            previousStatus: quote.status,
            newStatus: 'CONTACTED',
            changedBy: providerId,
          },
        });
        const acceptance = await tx.serviceLeadAcceptance.create({
          data: {
            serviceRequestId: id,
            providerId,
            policyVersion: quote.policyVersion,
            leadFeeUnits: quote.leadFee,
            commissionRate: quote.commissionRate,
            estimatedCommissionUnits: quote.estimatedCommission,
            basePrice: quote.basePrice,
            leadFeeReference: reference,
            acceptedAt: now,
          },
        });
        await this.credits.consume(tx, {
          userId: providerId,
          units: quote.leadFee,
          concept: 'LEAD_FEE',
          reference,
          metadata: {
            serviceRequestId: id,
            policyVersion: quote.policyVersion,
          },
        });
        return acceptance;
      });
    } catch (err) {
      if (err instanceof InsufficientUsageCreditsError) {
        throw new BadRequestException({
          message: 'No te alcanzan los créditos para el cargo por oportunidad.',
          errorCode: 'USAGE_CREDITS_INSUFFICIENT',
        });
      }
      throw err;
    }
  }

  /**
   * Descuenta en créditos la comisión de una solicitud aceptada con cargo
   * por oportunidad. Devuelve true si quedó pagada en créditos (el cargo se
   * registra COLLECTED y no va al estado de cuenta); false si no aplica o no
   * alcanzan los créditos — el caller sigue con el cobro normal.
   */
  async chargeSuccessFeeInCredits(input: {
    serviceRequestId: string;
    providerId: string;
    feeAmount: number;
    metadata: Record<string, unknown>;
  }): Promise<boolean> {
    if (!this.isEnabled() || !(input.feeAmount > 0)) return false;
    const acceptance = await this.prisma.serviceLeadAcceptance.findUnique({
      where: { serviceRequestId: input.serviceRequestId },
      select: { id: true },
    });
    // Sin aceptación con cargo, el proveedor nunca consintió pagar en créditos.
    if (!acceptance) return false;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const result = await this.platformFees.chargeProviderFeeInTransaction(
          'SERVICE_REQUEST',
          input.providerId,
          input.feeAmount,
          `FEE-SVC-${input.serviceRequestId}`,
          { ...input.metadata, paidWith: 'USAGE_CREDITS' },
          { tx, collected: true }
        );
        // Ya registrada en un intento anterior (en créditos o en el estado de
        // cuenta): no se vuelve a descontar.
        if (!result.created) return false;
        await this.credits.consume(tx, {
          userId: input.providerId,
          units: input.feeAmount,
          concept: 'SUCCESS_FEE',
          reference: successFeeCreditReference(input.serviceRequestId),
          metadata: { serviceRequestId: input.serviceRequestId },
        });
        return true;
      });
      if (created) {
        await this.platformFees
          .notifyProviderFee({
            type: 'SERVICE_REQUEST',
            userId: input.providerId,
            feeAmount: input.feeAmount,
            collected: true,
          })
          .catch(() => {});
      }
      return true;
    } catch (err) {
      if (err instanceof InsufficientUsageCreditsError) return false;
      throw err;
    }
  }
}
