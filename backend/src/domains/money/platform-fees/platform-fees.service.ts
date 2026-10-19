import { Injectable, NotFoundException } from '@nestjs/common';
import { FeeTransactionType, FeePayer } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  div,
  mul,
  RATE_SCALE,
  round,
  toNumber,
  type MoneyInput,
} from '../../../common/money/money';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { PlatformFeesFacade, FeeConfig } from './platform-fees.facade';

export type { FeeConfig };

export interface UpsertRateDto {
  rate: number;
  payer: FeePayer;
}

export interface CreateOverrideDto {
  type: FeeTransactionType;
  rate: number;
  payer?: FeePayer;
  planId?: string;
  userId?: string;
}

@Injectable()
export class PlatformFeesService implements PlatformFeesFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService
  ) {}

  // ─── Resolución de la tasa efectiva ──────────────────────────────────────────
  // Prioridad: override por userId > override por planId > tasa global activa.
  // Devuelve null si no hay ninguna tasa configurada (no se cobra nada).
  // El payer de un override puede venir vacío (hereda de la tasa global); si
  // tampoco hay tasa global, el override igual aplica con el único payer que
  // tenga sentido en ese momento — nunca se descarta silenciosamente.
  async resolveFeeConfig(
    type: FeeTransactionType,
    userId?: string
  ): Promise<FeeConfig | null> {
    const global = await this.getGlobalRate(type);

    if (userId) {
      const userOverride = await this.prisma.platformFeeOverride.findFirst({
        where: { type, userId, isActive: true },
      });
      if (userOverride) {
        return {
          rate: toNumber(userOverride.rate, RATE_SCALE),
          payer: userOverride.payer ?? global?.payer ?? 'PROVIDER',
        };
      }

      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        orderBy: { createdAt: 'desc' },
        select: { planId: true },
      });
      if (subscription) {
        const planOverride = await this.prisma.platformFeeOverride.findFirst({
          where: { type, planId: subscription.planId, isActive: true },
        });
        if (planOverride) {
          return {
            rate: toNumber(planOverride.rate, RATE_SCALE),
            payer: planOverride.payer ?? global?.payer ?? 'PROVIDER',
          };
        }
      }
    }

    return global
      ? { rate: toNumber(global.rate, RATE_SCALE), payer: global.payer }
      : null;
  }

  private async getGlobalRate(type: FeeTransactionType) {
    return this.prisma.platformFeeRate.findFirst({
      where: { type, isActive: true },
    });
  }

  // Decimal + HALF_UP al centavo: con Float, 1.45 × 10% daba 0.14 en vez de
  // 0.15 (0.145 se guarda como 0.14499…).
  calculateFee(
    baseAmount: MoneyInput,
    config: FeeConfig
  ): { feeAmount: number } {
    const feeAmount = round(mul(baseAmount, div(config.rate, 100)));
    return { feeAmount: toNumber(feeAmount) };
  }

  // Débito automático al proveedor/comercio/conductor cuando payer=PROVIDER.
  async chargeProviderFee(
    type: FeeTransactionType,
    userId: string,
    feeAmount: number,
    reference: string,
    metadata: Record<string, unknown>
  ) {
    if (feeAmount <= 0) return null;
    const result = await this.wallets.chargePlatformFee(
      userId,
      feeAmount,
      reference,
      metadata
    );
    this.notifications
      .notifyPlatformFeeCharged(userId, type, feeAmount)
      .catch(() => {});
    return result;
  }

  // ─── Administración (SUPERADMIN) ─────────────────────────────────────────────

  async getRates() {
    return this.prisma.platformFeeRate.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });
  }

  async getPublicRates() {
    // Solo se expone lo que afecta el precio visible al cliente.
    return this.prisma.platformFeeRate.findMany({
      where: { isActive: true, payer: 'CLIENT' },
      select: { type: true, rate: true },
    });
  }

  async upsertRate(
    type: FeeTransactionType,
    dto: UpsertRateDto,
    adminId: string
  ) {
    const existing = await this.prisma.platformFeeRate.findFirst({
      where: { type, isActive: true },
    });
    if (existing) {
      return this.prisma.platformFeeRate.update({
        where: { id: existing.id },
        data: { rate: dto.rate, payer: dto.payer, updatedById: adminId },
      });
    }
    return this.prisma.platformFeeRate.create({
      data: { type, rate: dto.rate, payer: dto.payer, updatedById: adminId },
    });
  }

  async getOverrides() {
    return this.prisma.platformFeeOverride.findMany({
      where: { isActive: true },
      include: {
        plan: { select: { id: true, name: true } },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOverride(dto: CreateOverrideDto) {
    if (!dto.planId && !dto.userId) {
      throw new NotFoundException(
        'Debe especificar un plan o un usuario para el override'
      );
    }
    return this.prisma.platformFeeOverride.create({
      data: {
        type: dto.type,
        rate: dto.rate,
        payer: dto.payer,
        planId: dto.planId,
        userId: dto.userId,
      },
    });
  }

  async deleteOverride(id: string) {
    await this.prisma.platformFeeOverride.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
