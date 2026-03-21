import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const rates = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
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

    return this.prisma.exchangeRate.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        updatedBy: userId,
      },
    });
  }

  async update(id: string, dto: UpdateExchangeRateDto, userId: string) {
    await this.findOne(id);

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

    return this.prisma.exchangeRate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        updatedBy: userId,
      },
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
