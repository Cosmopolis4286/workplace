import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../../money/exchange-rates/exchange-rates.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesDto } from './dto/query-purchases.dto';

// Cuántas compras recientes se promedian para el "costo de reposición
// promedio" — ver WORKPLACE_VISION.md (Business Shield, sección 5).
const REPLACEMENT_COST_SAMPLE_SIZE = 5;

// Umbral de la alerta MARGIN_DROP: el margen de reposición debe caer al
// menos esta cantidad de puntos porcentuales por debajo del margen
// histórico para justificar notificar al comerciante. Ver sección 21
// (Alert Engine) de WORKPLACE_VISION.md — valor fijo por ahora, sin UI de
// configuración todavía (se valida primero si esto genera valor real).
const MARGIN_DROP_THRESHOLD_PCT = 5;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly notifications: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  // Resuelve moneda -> tasa a USD en el momento de la compra. USD es la
  // moneda base del sistema y no requiere fila en ExchangeRate.
  private async resolveRate(
    currencyCode: string,
  ): Promise<{ rateToUsd: number; source: string | null }> {
    const code = currencyCode.toUpperCase();
    if (code === 'USD') return { rateToUsd: 1, source: null };

    const rate = await this.exchangeRates.findByCode(code);
    if (!rate.rateToUsd || rate.rateToUsd <= 0) {
      throw new BadRequestException(
        this.i18n.t('purchases.invalid_exchange_rate', { args: { code } }),
      );
    }
    return { rateToUsd: rate.rateToUsd, source: rate.syncSource ?? rate.source };
  }

  async create(commerceId: string, userId: string, dto: CreatePurchaseDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, commerceId },
    });
    if (!product) throw new NotFoundException(this.i18n.t('purchases.product_not_found'));

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, commerceId },
      });
      if (!supplier) throw new NotFoundException(this.i18n.t('purchases.supplier_not_found'));
    }

    const currencyCode = dto.currencyCode.toUpperCase();
    const { rateToUsd, source } = await this.resolveRate(currencyCode);
    const unitCostUsd = dto.unitCost / rateToUsd;

    const purchase = await this.prisma.purchase.create({
      data: {
        commerceId,
        productId: dto.productId,
        supplierId: dto.supplierId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        currencyCode,
        exchangeRateValue: rateToUsd,
        exchangeRateSource: source,
        unitCostUsd,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    // Best-effort: una falla al notificar no debe hacer fallar el registro
    // de la compra, que ya se guardó correctamente.
    this.checkMarginDrop(commerceId, dto.productId, product.name).catch(() => {});

    return purchase;
  }

  private async checkMarginDrop(commerceId: string, productId: string, productName: string) {
    const replacement = await this.getReplacementCost(productId, commerceId);
    if (
      !replacement.hasPurchaseData ||
      replacement.marginHistoricalPct === null ||
      replacement.marginReplacementPct === null
    ) {
      return;
    }
    const drop = replacement.marginHistoricalPct - replacement.marginReplacementPct;
    if (drop >= MARGIN_DROP_THRESHOLD_PCT) {
      await this.notifications.notifyMarginDrop(
        commerceId,
        productName,
        replacement.marginHistoricalPct,
        replacement.marginReplacementPct,
      );
    }
  }

  async findAll(commerceId: string, query: QueryPurchasesDto) {
    const { productId, supplierId, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: any = { commerceId };
    if (productId) where.productId = productId;
    if (supplierId) where.supplierId = supplierId;
    if (dateFrom || dateTo) {
      where.purchasedAt = {};
      if (dateFrom) where.purchasedAt.gte = new Date(dateFrom);
      if (dateTo) where.purchasedAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
        },
        orderBy: { purchasedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async remove(id: string, commerceId: string) {
    const purchase = await this.prisma.purchase.findFirst({ where: { id, commerceId } });
    if (!purchase) throw new NotFoundException(this.i18n.t('purchases.not_found'));
    await this.prisma.purchase.delete({ where: { id } });
    return { message: this.i18n.t('purchases.deleted') };
  }

  // ── Costo de reposición (Business Shield) ───────────────────────────────
  //
  // Compara el costo histórico del producto (Product.cost, cargado a mano
  // por el comerciante) contra lo que realmente costaría reponerlo hoy,
  // calculado desde las compras reales registradas. Ver WORKPLACE_VISION.md
  // secciones 4-5.
  async getReplacementCost(productId: string, commerceId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, commerceId },
    });
    if (!product) throw new NotFoundException(this.i18n.t('purchases.product_not_found'));

    const recentPurchases = await this.prisma.purchase.findMany({
      where: { productId, commerceId },
      orderBy: { purchasedAt: 'desc' },
      take: REPLACEMENT_COST_SAMPLE_SIZE,
    });

    const historicalCost = product.cost;
    const price = product.price;

    if (recentPurchases.length === 0) {
      return {
        productId,
        historicalCost,
        price,
        lastPurchaseCostUsd: null,
        averageReplacementCostUsd: null,
        marginHistoricalPct: this.marginPct(price, historicalCost),
        marginReplacementPct: null,
        hasPurchaseData: false,
      };
    }

    const lastPurchaseCostUsd = recentPurchases[0].unitCostUsd;
    const averageReplacementCostUsd =
      recentPurchases.reduce((sum, p) => sum + p.unitCostUsd, 0) / recentPurchases.length;

    return {
      productId,
      historicalCost,
      price,
      lastPurchaseCostUsd,
      averageReplacementCostUsd,
      marginHistoricalPct: this.marginPct(price, historicalCost),
      marginReplacementPct: this.marginPct(price, averageReplacementCostUsd),
      hasPurchaseData: true,
      samplesUsed: recentPurchases.length,
    };
  }

  private marginPct(price: number, cost: number | null): number | null {
    if (cost === null || price <= 0) return null;
    return Math.round(((price - cost) / price) * 1000) / 10;
  }
}
