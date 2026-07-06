import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcvSyncService } from './bcv-sync.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcvSyncService: BcvSyncService,
  ) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const rates = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });

    // Best-effort: refresh any auto-sync currency whose rate has gone stale
    // before returning it, so a request never surfaces a rate older than the
    // staleness threshold just because a scheduled cron didn't fire.
    // ensureFreshRate() no-ops instantly when the rate is already fresh, so
    // this costs nothing extra in the common case.
    const refreshed = await Promise.allSettled(
      rates.filter(r => r.autoSync).map(r => this.bcvSyncService.ensureFreshRate(r.code)),
    );
    const anyRefreshed = refreshed.some(r => r.status === 'fulfilled' && r.value === true);
    if (anyRefreshed) {
      return this.prisma.exchangeRate.findMany({ where, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
    }

    return rates;
  }

  async findOne(id: string) {
    const rate = await this.prisma.exchangeRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException(`Tasa de cambio no encontrada`);
    return rate;
  }

  async findDefault() {
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (rate?.autoSync) {
      const refreshed = await this.bcvSyncService.ensureFreshRate(rate.code);
      // Only re-read from DB if the sync actually updated the row
      if (refreshed) {
        return this.prisma.exchangeRate.findUnique({ where: { id: rate.id } });
      }
    }

    return rate;
  }

  async findByCode(code: string) {
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!rate) throw new NotFoundException(`Moneda ${code} no encontrada`);
    return rate;
  }

  async create(dto: CreateExchangeRateDto, userId: string) {
    const existing = await this.prisma.exchangeRate.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una tasa para el código ${dto.code.toUpperCase()}`
      );
    }

    // If setting as default, unset previous default
    if (dto.isDefault) {
      await this.prisma.exchangeRate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const rate = await this.prisma.exchangeRate.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        updatedBy: userId,
      },
    });

    await this.prisma.exchangeRateHistory.create({
      data: {
        exchangeRateId: rate.id,
        code: rate.code,
        previousRate: null,
        newRate: rate.rateToUsd,
        source: 'CREATE',
        changedBy: userId,
      },
    });

    return rate;
  }

  async update(id: string, dto: UpdateExchangeRateDto, userId: string) {
    const existing = await this.findOne(id);

    // Check code uniqueness if changing code
    if (dto.code) {
      const conflict = await this.prisma.exchangeRate.findFirst({
        where: { code: dto.code.toUpperCase(), id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe una tasa para el código ${dto.code.toUpperCase()}`
        );
      }
    }

    // If setting as default, unset previous default
    if (dto.isDefault) {
      await this.prisma.exchangeRate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.exchangeRate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        updatedBy: userId,
      },
    });

    if (
      typeof dto.rateToUsd === 'number' &&
      dto.rateToUsd !== existing.rateToUsd
    ) {
      await this.prisma.exchangeRateHistory.create({
        data: {
          exchangeRateId: updated.id,
          code: updated.code,
          previousRate: existing.rateToUsd,
          newRate: updated.rateToUsd,
          source: 'MANUAL',
          changedBy: userId,
        },
      });
    }

    return updated;
  }

  async getHistory(id: string, limit = 50) {
    await this.findOne(id);
    return this.prisma.exchangeRateHistory.findMany({
      where: { exchangeRateId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async setDefault(id: string, userId: string) {
    const rate = await this.findOne(id);
    if (!rate.isActive) {
      throw new BadRequestException(
        'No se puede establecer como predeterminada una tasa inactiva'
      );
    }

    await this.prisma.exchangeRate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.exchangeRate.update({
      where: { id },
      data: { isDefault: true, updatedBy: userId },
    });
  }

  async toggleStatus(id: string, userId: string) {
    const rate = await this.findOne(id);

    if (rate.isDefault && rate.isActive) {
      throw new BadRequestException(
        'No se puede desactivar la tasa predeterminada'
      );
    }

    return this.prisma.exchangeRate.update({
      where: { id },
      data: { isActive: !rate.isActive, updatedBy: userId },
    });
  }

  async remove(id: string) {
    const rate = await this.findOne(id);
    if (rate.isDefault) {
      throw new BadRequestException(
        'No se puede eliminar la tasa predeterminada'
      );
    }
    return this.prisma.exchangeRate.delete({ where: { id } });
  }

  async getStats() {
    const [total, active, withDefault] = await Promise.all([
      this.prisma.exchangeRate.count(),
      this.prisma.exchangeRate.count({ where: { isActive: true } }),
      this.prisma.exchangeRate.findFirst({ where: { isDefault: true } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      defaultCurrency: withDefault ? withDefault.code : null,
      defaultRate: withDefault ? withDefault.rateToUsd : null,
    };
  }

  // Public endpoint: convert amount from USD to all active currencies
  convertAmount(amountUsd: number) {
    return this.prisma.exchangeRate
      .findMany({ where: { isActive: true } })
      .then((rates) =>
        rates.map((r) => ({
          code: r.code,
          name: r.name,
          symbol: r.symbol,
          rate: r.rateToUsd,
          converted: +(amountUsd * r.rateToUsd).toFixed(2),
          isDefault: r.isDefault,
        }))
      );
  }
}
