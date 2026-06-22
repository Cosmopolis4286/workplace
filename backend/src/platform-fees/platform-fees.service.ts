import { Injectable, NotFoundException } from '@nestjs/common';
import { FeeTransactionType, FeePayer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface FeeConfig {
  rate: number;
  payer: FeePayer;
}

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
export class PlatformFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Resolución de la tasa efectiva ──────────────────────────────────────────
  // Prioridad: override por userId > override por planId > tasa global activa.
  // Devuelve null si no hay ninguna tasa configurada (no se cobra nada).
  async resolveFeeConfig(type: FeeTransactionType, userId?: string): Promise<FeeConfig | null> {
    if (userId) {
      const userOverride = await this.prisma.platformFeeOverride.findFirst({
        where: { type, userId, isActive: true },
      });
      if (userOverride) {
        const fallbackPayer = userOverride.payer ?? (await this.getGlobalRate(type))?.payer;
        if (fallbackPayer) return { rate: userOverride.rate, payer: fallbackPayer };
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
          const fallbackPayer = planOverride.payer ?? (await this.getGlobalRate(type))?.payer;
          if (fallbackPayer) return { rate: planOverride.rate, payer: fallbackPayer };
        }
      }
    }

    const global = await this.getGlobalRate(type);
    return global ? { rate: global.rate, payer: global.payer } : null;
  }

  private async getGlobalRate(type: FeeTransactionType) {
    return this.prisma.platformFeeRate.findFirst({ where: { type, isActive: true } });
  }

  calculateFee(baseAmount: number, config: FeeConfig): { feeAmount: number } {
    const feeAmount = Math.round(baseAmount * (config.rate / 100) * 100) / 100;
    return { feeAmount };
  }

  // Débito automático al proveedor/comercio/conductor cuando payer=PROVIDER.
  async chargeProviderFee(
    userId: string,
    feeAmount: number,
    reference: string,
    metadata: Record<string, unknown>,
  ) {
    if (feeAmount <= 0) return null;
    const result = await this.wallets.chargePlatformFee(userId, feeAmount, reference, metadata);
    const feeType = (metadata.orderId ? 'ORDER' : metadata.serviceRequestId ? 'SERVICE_REQUEST' : 'CORRIDA') as
      | 'ORDER'
      | 'SERVICE_REQUEST'
      | 'CORRIDA';
    this.notifications.notifyPlatformFeeCharged(userId, feeType, feeAmount).catch(() => {});
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

  async upsertRate(type: FeeTransactionType, dto: UpsertRateDto, adminId: string) {
    const existing = await this.prisma.platformFeeRate.findFirst({ where: { type, isActive: true } });
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
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOverride(dto: CreateOverrideDto) {
    if (!dto.planId && !dto.userId) {
      throw new NotFoundException('Debe especificar un plan o un usuario para el override');
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
