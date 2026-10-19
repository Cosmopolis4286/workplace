import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BcvSyncService } from './bcv-sync.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import {
  eq,
  isPositive,
  mul,
  toDecimal,
  toNumber,
} from '../../../common/money/money';

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcvSyncService: BcvSyncService
  ) {}

  // Resuelve moneda -> tasa a USD para operaciones que necesitan un snapshot
  // inmutable (Purchase, SupplierQuote): USD es la moneda base y no requiere
  // fila en ExchangeRate. Devuelve null si la moneda no existe o su tasa es
  // inválida — el llamador decide el mensaje de error (evita acoplar este
  // servicio a los i18n keys de otros dominios).
  async resolveRateToUsd(
    currencyCode: string
  ): Promise<{ rateToUsd: Prisma.Decimal; source: string | null } | null> {
    const code = currencyCode.toUpperCase();
    if (code === 'USD') return { rateToUsd: toDecimal(1), source: null };

    const rate = await this.prisma.exchangeRate.findUnique({ where: { code } });
    if (!rate || !isPositive(rate.rateToUsd)) return null;
    return {
      rateToUsd: rate.rateToUsd,
      source: rate.syncSource ?? rate.source,
    };
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const rates = await this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });

    // Fire-and-forget: dispara el refresh de cualquier moneda auto-sync que
    // esté stale, sin esperarlo — este request responde con lo que ya había
    // en DB (posiblemente stale), el PRÓXIMO request ya ve la tasa fresca.
    // ensureFreshRate() no-opea al instante si ya está fresca. Antes se
    // esperaba el sync inline, lo que podía bloquear este GET hasta ~40s si
    // el BCV estaba caído — el peor momento para que un endpoint cuelgue.
    rates
      .filter((r) => r.autoSync)
      .forEach((r) => this.bcvSyncService.ensureFreshRate(r.code));

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

    // Fire-and-forget, mismo criterio que findAll() — no bloquear este GET
    // esperando una request de red al BCV.
    if (rate?.autoSync) {
      this.bcvSyncService.ensureFreshRate(rate.code);
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
      !eq(dto.rateToUsd, existing.rateToUsd)
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

  // Ningún modelo tiene FK real a ExchangeRate (currencyCode es un string
  // suelto + snapshot inmutable de exchangeRateValue en el momento de la
  // transacción — ver comentarios en esos modelos) así que eliminar una
  // moneda nunca deja nada huérfano a nivel técnico. Este conteo es solo
  // para que el admin vea el impacto REAL antes de confirmar: los registros
  // históricos siguen siendo legibles, pero esa moneda ya no podrá elegirse
  // para compras/cotizaciones nuevas una vez eliminada.
  async getUsageCount(id: string) {
    const rate = await this.findOne(id);
    const code = rate.code;

    const [purchases, supplierQuotes, receivables, payables, groupBuying] =
      await Promise.all([
        this.prisma.purchase.count({ where: { currencyCode: code } }),
        this.prisma.supplierQuote.count({ where: { currencyCode: code } }),
        this.prisma.accountReceivable.count({ where: { currencyCode: code } }),
        this.prisma.accountPayable.count({ where: { currencyCode: code } }),
        this.prisma.groupBuyingCampaign.count({
          where: { currencyCode: code },
        }),
      ]);

    return {
      code,
      total: purchases + supplierQuotes + receivables + payables + groupBuying,
      breakdown: {
        purchases,
        supplierQuotes,
        receivables,
        payables,
        groupBuying,
      },
    };
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
          converted: toNumber(mul(amountUsd, r.rateToUsd)),
          isDefault: r.isDefault,
        }))
      );
  }
}
