import { BadRequestException, Injectable } from '@nestjs/common';
import { ProfileStatus, ProfileType, Role } from '@prisma/client';
import { RedisService } from '../../../redis/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';

export interface WalletLimits {
  maxSingleTx: number; // Max per single transaction
  dailyDebit: number; // Max debit (withdraw + transfer + payment) per day
  monthlyDebit: number; // Max debit per month
  maxBalance: number; // Max balance allowed
  dailyTransfers: number; // Max number of transfers per day
}

// Límites por tipo de cuenta — admins sin límite práctico. COMMERCE y
// FREELANCER no son valores de Role: se deducen del perfil (ver
// resolveTier). Antes se buscaban por Role y nunca coincidían, así que
// comercios y profesionales quedaban con los límites de un cliente.
export type WalletLimitTier =
  | 'NORMAL'
  | 'FREELANCER'
  | 'COMMERCE'
  | 'ADMIN'
  | 'SUPERADMIN';

const LIMITS_BY_ROLE: Record<WalletLimitTier, WalletLimits> = {
  NORMAL: {
    maxSingleTx: 500,
    dailyDebit: 1_000,
    monthlyDebit: 5_000,
    maxBalance: 2_000,
    dailyTransfers: 5,
  },
  FREELANCER: {
    maxSingleTx: 2_000,
    dailyDebit: 5_000,
    monthlyDebit: 20_000,
    maxBalance: 10_000,
    dailyTransfers: 20,
  },
  COMMERCE: {
    maxSingleTx: 10_000,
    dailyDebit: 25_000,
    monthlyDebit: 100_000,
    maxBalance: 50_000,
    dailyTransfers: 50,
  },
  ADMIN: {
    maxSingleTx: 999_999,
    dailyDebit: 999_999,
    monthlyDebit: 9_999_999,
    maxBalance: 9_999_999,
    dailyTransfers: 999,
  },
  SUPERADMIN: {
    maxSingleTx: 999_999,
    dailyDebit: 999_999,
    monthlyDebit: 9_999_999,
    maxBalance: 9_999_999,
    dailyTransfers: 999,
  },
};

@Injectable()
export class WalletLimitsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Tipo de cuenta para límites: admins por rol; dueño de comercio →
   * COMMERCE; rol PROFESIONAL o perfil profesional activo → FREELANCER;
   * el resto, NORMAL.
   */
  async resolveTier(userId: string, role: Role): Promise<WalletLimitTier> {
    if (role === Role.SUPERADMIN || role === Role.ADMIN) return role;
    const [commerce, professional] = await Promise.all([
      this.prisma.commerce.findUnique({
        where: { userId },
        select: { id: true },
      }),
      role === Role.PROFESIONAL
        ? Promise.resolve({ id: 'role' })
        : this.prisma.userProfile.findFirst({
            where: {
              userId,
              type: ProfileType.PROFESSIONAL,
              status: ProfileStatus.ACTIVE,
            },
            select: { id: true },
          }),
    ]);
    if (commerce) return 'COMMERCE';
    if (professional) return 'FREELANCER';
    return 'NORMAL';
  }

  async getLimitsFor(userId: string, role: Role): Promise<WalletLimits> {
    return LIMITS_BY_ROLE[await this.resolveTier(userId, role)];
  }

  async assertSingleTxLimit(userId: string, role: Role, amount: number) {
    const { maxSingleTx } = await this.getLimitsFor(userId, role);
    if (amount > maxSingleTx) {
      throw new BadRequestException(
        `El monto máximo por transacción es ${maxSingleTx} para tu tipo de cuenta`
      );
    }
  }

  async assertDailyDebitLimit(userId: string, role: Role, amount: number) {
    const { dailyDebit } = await this.getLimitsFor(userId, role);
    const used = await this.getDailyDebitUsed(userId);
    if (used + amount > dailyDebit) {
      throw new BadRequestException(
        `Límite diario de débito alcanzado (${dailyDebit}). Usado: ${used.toFixed(2)}`
      );
    }
  }

  async assertMonthlyDebitLimit(userId: string, role: Role, amount: number) {
    const { monthlyDebit } = await this.getLimitsFor(userId, role);
    const used = await this.getMonthlyDebitUsed(userId);
    if (used + amount > monthlyDebit) {
      throw new BadRequestException(
        `Límite mensual de débito alcanzado (${monthlyDebit}). Usado: ${used.toFixed(2)}`
      );
    }
  }

  async assertBalanceLimit(userId: string, role: Role, newBalance: number) {
    const { maxBalance } = await this.getLimitsFor(userId, role);
    if (newBalance > maxBalance) {
      throw new BadRequestException(
        `El saldo no puede superar ${maxBalance} para tu tipo de cuenta`
      );
    }
  }

  async assertDailyTransferLimit(userId: string, role: Role) {
    const { dailyTransfers } = await this.getLimitsFor(userId, role);
    const used = await this.getDailyTransferCount(userId);
    if (used >= dailyTransfers) {
      throw new BadRequestException(
        `Límite de transferencias diarias alcanzado (${dailyTransfers})`
      );
    }
  }

  async recordDebit(userId: string, amount: number) {
    await Promise.all([
      this.incrRedis(
        this.dailyDebitKey(userId),
        amount,
        this.secondsUntilEndOfDay()
      ),
      this.incrRedis(
        this.monthlyDebitKey(userId),
        amount,
        this.secondsUntilEndOfMonth()
      ),
    ]);
  }

  async recordTransfer(userId: string) {
    await this.incrRedis(
      this.dailyTransferKey(userId),
      1,
      this.secondsUntilEndOfDay()
    );
  }

  async getLimitsStatus(userId: string, role: Role) {
    const limits = await this.getLimitsFor(userId, role);
    const [dailyDebitUsed, monthlyDebitUsed, dailyTransferCount] =
      await Promise.all([
        this.getDailyDebitUsed(userId),
        this.getMonthlyDebitUsed(userId),
        this.getDailyTransferCount(userId),
      ]);

    return {
      limits,
      used: {
        dailyDebit: dailyDebitUsed,
        monthlyDebit: monthlyDebitUsed,
        dailyTransfers: dailyTransferCount,
      },
      remaining: {
        dailyDebit: Math.max(0, limits.dailyDebit - dailyDebitUsed),
        monthlyDebit: Math.max(0, limits.monthlyDebit - monthlyDebitUsed),
        dailyTransfers: Math.max(0, limits.dailyTransfers - dailyTransferCount),
      },
    };
  }

  // ─── Redis key helpers ───────────────────────────────────────────────────────

  private dailyDebitKey(userId: string) {
    return `wallet:limits:daily_debit:${userId}:${this.todayStr()}`;
  }
  private monthlyDebitKey(userId: string) {
    return `wallet:limits:monthly_debit:${userId}:${this.monthStr()}`;
  }
  private dailyTransferKey(userId: string) {
    return `wallet:limits:daily_transfers:${userId}:${this.todayStr()}`;
  }

  private async getDailyDebitUsed(userId: string): Promise<number> {
    const val = await this.redis.get(this.dailyDebitKey(userId));
    return val ? parseFloat(val) : 0;
  }
  private async getMonthlyDebitUsed(userId: string): Promise<number> {
    const val = await this.redis.get(this.monthlyDebitKey(userId));
    return val ? parseFloat(val) : 0;
  }
  private async getDailyTransferCount(userId: string): Promise<number> {
    const val = await this.redis.get(this.dailyTransferKey(userId));
    return val ? parseInt(val) : 0;
  }

  private async incrRedis(key: string, amount: number, ttl: number) {
    await this.redis.incrbyfloatWithExpire(key, amount, ttl);
  }

  private todayStr() {
    return new Date().toISOString().slice(0, 10);
  }
  private monthStr() {
    return new Date().toISOString().slice(0, 7);
  }
  private secondsUntilEndOfDay(): number {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return Math.ceil((end.getTime() - now.getTime()) / 1000);
  }
  private secondsUntilEndOfMonth(): number {
    const now = new Date();
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    return Math.ceil((end.getTime() - now.getTime()) / 1000);
  }
}
