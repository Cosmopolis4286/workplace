import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../../money/exchange-rates/exchange-rates.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { AlertEngineService } from '../alert-engine/alert-engine.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesDto } from './dto/query-purchases.dto';
import { AlertType, Prisma, ProductStatus } from '@prisma/client';
import {
  div,
  isPositive,
  RATE_SCALE,
  roundRate,
  sum,
  toDecimal,
  toNumber,
} from '../../../common/money/money';

// Cuántas compras recientes se promedian para el "costo de reposición
// promedio" — ver WORKPLACE_VISION.md (Business Shield, sección 5).
const REPLACEMENT_COST_SAMPLE_SIZE = 5;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly notifications: NotificationsService,
    private readonly alertEngine: AlertEngineService,
    private readonly i18n: I18nService
  ) {}

  // Resuelve moneda -> tasa a USD en el momento de la compra. USD es la
  // moneda base del sistema y no requiere fila en ExchangeRate.
  private async resolveRate(
    currencyCode: string
  ): Promise<{ rateToUsd: Prisma.Decimal; source: string | null }> {
    const code = currencyCode.toUpperCase();
    if (code === 'USD') return { rateToUsd: toDecimal(1), source: null };

    const rate = await this.exchangeRates.findByCode(code);
    if (!isPositive(rate.rateToUsd)) {
      throw new BadRequestException(
        this.i18n.t('purchases.invalid_exchange_rate', { args: { code } })
      );
    }
    return {
      rateToUsd: toDecimal(rate.rateToUsd),
      source: rate.syncSource ?? rate.source,
    };
  }

  async create(commerceId: string, userId: string, dto: CreatePurchaseDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, commerceId },
    });
    if (!product)
      throw new NotFoundException(this.i18n.t('purchases.product_not_found'));

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, commerceId },
      });
      if (!supplier)
        throw new NotFoundException(
          this.i18n.t('purchases.supplier_not_found')
        );
    }

    const currencyCode = dto.currencyCode.toUpperCase();
    const { rateToUsd, source } = await this.resolveRate(currencyCode);
    // 8 decimales: el costo unitario en USD de un producto barato en Bs es
    // fracción de centavo (1 Bs / 36.5 = 0.0274 USD) y redondearlo al centavo
    // distorsionaría los márgenes.
    const unitCostUsd = roundRate(div(dto.unitCost, rateToUsd));

    // Reponer stock y registrar la compra en una sola transacción: sin esto,
    // comprarle a un proveedor no aumentaba el inventario disponible y había
    // que ir aparte a ajustar stock a mano (flujo compra→stock desconectado).
    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
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
          product: { select: { id: true, name: true } },
        },
      });

      const newStock = product.stock + dto.quantity;
      const newStatus =
        newStock === 0
          ? ProductStatus.OUT_OF_STOCK
          : newStock <= product.minStock
            ? ProductStatus.LOW_STOCK
            : ProductStatus.AVAILABLE;
      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock, status: newStatus },
      });

      return created;
    });

    // Best-effort: una falla al notificar no debe hacer fallar el registro
    // de la compra, que ya se guardó correctamente.
    this.checkMarginDrop(commerceId, dto.productId, product.name).catch(
      () => {}
    );

    return purchase;
  }

  private async checkMarginDrop(
    commerceId: string,
    productId: string,
    productName: string
  ) {
    const replacement = await this.getReplacementCost(productId, commerceId);
    if (
      !replacement.hasPurchaseData ||
      replacement.marginHistoricalPct === null ||
      replacement.marginReplacementPct === null
    ) {
      return;
    }
    const drop =
      replacement.marginHistoricalPct - replacement.marginReplacementPct;
    // Threshold configurable por comercio (Alert Engine, ver
    // WORKPLACE_VISION.md sección 21) — antes era un valor fijo en código.
    if (
      await this.alertEngine.shouldFire(commerceId, AlertType.MARGIN_DROP, drop)
    ) {
      await this.notifications.notifyMarginDrop(
        commerceId,
        productName,
        replacement.marginHistoricalPct,
        replacement.marginReplacementPct
      );
    }
  }

  async findAll(commerceId: string, query: QueryPurchasesDto) {
    const {
      productId,
      supplierId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

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
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, commerceId },
    });
    if (!purchase)
      throw new NotFoundException(this.i18n.t('purchases.not_found'));
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
    if (!product)
      throw new NotFoundException(this.i18n.t('purchases.product_not_found'));

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

    const lastPurchaseCostUsd = toNumber(
      recentPurchases[0].unitCostUsd,
      RATE_SCALE
    );
    const averageReplacementCostUsd = toNumber(
      div(
        sum(recentPurchases.map((p) => p.unitCostUsd)),
        recentPurchases.length
      ),
      RATE_SCALE
    );

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

  // ── Reporte de márgenes (Business Shield, agregado) ──────────────────────
  //
  // getReplacementCost es por-producto (usado por ReplacementCostCard en el
  // modal de edición). Este método da la vista que faltaba: TODOS los
  // productos con compras registradas, ordenados por mayor caída de margen
  // (histórico vs. reposición), para que el dueño del comercio vea de un
  // vistazo qué productos están perdiendo margen sin tener que abrirlos uno
  // por uno. Reutiliza el mismo cálculo de marginPct, no lo duplica.
  async getMarginReport(commerceId: string, page = 1, limit = 20) {
    const productsWithPurchases = await this.prisma.product.findMany({
      where: { commerceId, purchases: { some: {} } },
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: REPLACEMENT_COST_SAMPLE_SIZE,
          select: { unitCostUsd: true },
        },
      },
    });

    const rows = productsWithPurchases.map((p) => {
      const averageReplacementCostUsd = toNumber(
        div(sum(p.purchases.map((pu) => pu.unitCostUsd)), p.purchases.length),
        RATE_SCALE
      );
      const marginHistoricalPct = this.marginPct(p.price, p.cost);
      const marginReplacementPct = this.marginPct(
        p.price,
        averageReplacementCostUsd
      );
      const marginDropPct =
        marginHistoricalPct !== null && marginReplacementPct !== null
          ? Math.round((marginHistoricalPct - marginReplacementPct) * 10) / 10
          : null;

      return {
        productId: p.id,
        productName: p.name,
        price: p.price,
        historicalCost: p.cost,
        averageReplacementCostUsd,
        marginHistoricalPct,
        marginReplacementPct,
        marginDropPct,
        samplesUsed: p.purchases.length,
      };
    });

    // Mayor caída de margen primero; nulls (sin margen calculable) al final.
    rows.sort(
      (a, b) => (b.marginDropPct ?? -Infinity) - (a.marginDropPct ?? -Infinity)
    );

    const total = rows.length;
    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
