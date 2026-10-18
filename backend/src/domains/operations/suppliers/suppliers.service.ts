import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../../money/exchange-rates/exchange-rates.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { AlertEngineService } from '../alert-engine/alert-engine.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierQuoteDto } from './dto/create-supplier-quote.dto';
import { AlertType } from '@prisma/client';

// Cuántas cotizaciones anteriores del mismo proveedor+producto se miran para
// calcular "cuánto subió el precio en los últimos N días" (sección 12 de
// WORKPLACE_VISION.md — Supplier Intelligence).
const PRICE_TREND_LOOKBACK_DAYS = 30;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly notifications: NotificationsService,
    private readonly alertEngine: AlertEngineService,
    private readonly i18n: I18nService
  ) {}

  // ── Suppliers CRUD ─────────────────────────────────────────────────────────

  async findAll(commerceId: string) {
    return this.prisma.supplier.findMany({
      where: { commerceId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, commerceId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, commerceId },
    });
    if (!supplier)
      throw new NotFoundException(this.i18n.t('suppliers.not_found'));
    return supplier;
  }

  async create(commerceId: string, dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { name: dto.name, commerceId },
    });
    if (existing)
      throw new ConflictException(this.i18n.t('suppliers.name_taken'));

    return this.prisma.supplier.create({ data: { ...dto, commerceId } });
  }

  async update(id: string, commerceId: string, dto: UpdateSupplierDto) {
    await this.findOne(id, commerceId);

    if (dto.name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { name: dto.name, commerceId, id: { not: id } },
      });
      if (existing)
        throw new ConflictException(this.i18n.t('suppliers.name_taken'));
    }

    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string, commerceId: string) {
    await this.findOne(id, commerceId);
    await this.prisma.supplier.delete({ where: { id } });
    return { message: this.i18n.t('suppliers.deleted') };
  }

  // ── Quotes ─────────────────────────────────────────────────────────────────

  async createQuote(
    supplierId: string,
    commerceId: string,
    dto: CreateSupplierQuoteDto
  ) {
    const supplier = await this.findOne(supplierId, commerceId);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, commerceId },
    });
    if (!product)
      throw new NotFoundException(this.i18n.t('suppliers.product_not_found'));

    const currencyCode = dto.currencyCode.toUpperCase();
    const resolved = await this.exchangeRates.resolveRateToUsd(currencyCode);
    if (!resolved) {
      throw new BadRequestException(
        this.i18n.t('suppliers.invalid_exchange_rate', {
          args: { code: currencyCode },
        })
      );
    }

    const priceUsd = dto.price / resolved.rateToUsd;

    const quote = await this.prisma.supplierQuote.create({
      data: {
        commerceId,
        supplierId,
        productId: dto.productId,
        price: dto.price,
        currencyCode,
        exchangeRateValue: resolved.rateToUsd,
        priceUsd,
        leadTimeDays: dto.leadTimeDays,
        available: dto.available ?? true,
        notes: dto.notes,
        quotedAt: dto.quotedAt ? new Date(dto.quotedAt) : undefined,
      },
    });

    // Best-effort: una falla al notificar no debe hacer fallar el registro
    // de la cotización, que ya se guardó correctamente.
    this.checkSupplierPriceChange(
      commerceId,
      supplierId,
      supplier.name,
      dto.productId,
      product.name,
      priceUsd,
      quote.id
    ).catch(() => {});

    return quote;
  }

  // Alert Engine — SUPPLIER_PRICE_CHANGE: compara la cotización recién creada
  // contra la anterior del mismo proveedor+producto dentro de la ventana de
  // lookback; si subió más del threshold configurado, notifica. Ver
  // WORKPLACE_VISION.md sección 12/21.
  private async checkSupplierPriceChange(
    commerceId: string,
    supplierId: string,
    supplierName: string,
    productId: string,
    productName: string,
    newPriceUsd: number,
    newQuoteId: string
  ) {
    const lookbackDate = new Date(
      Date.now() - PRICE_TREND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );
    const previous = await this.prisma.supplierQuote.findFirst({
      where: {
        supplierId,
        productId,
        commerceId,
        id: { not: newQuoteId },
        quotedAt: { gte: lookbackDate },
      },
      orderBy: { quotedAt: 'desc' },
    });
    if (!previous || previous.priceUsd <= 0) return;

    const priceChangePct =
      ((newPriceUsd - previous.priceUsd) / previous.priceUsd) * 100;
    if (
      await this.alertEngine.shouldFire(
        commerceId,
        AlertType.SUPPLIER_PRICE_CHANGE,
        priceChangePct
      )
    ) {
      await this.notifications.notifySupplierPriceChange(
        commerceId,
        supplierName,
        productName,
        priceChangePct,
        PRICE_TREND_LOOKBACK_DAYS
      );
    }
  }

  async listQuotesForSupplier(supplierId: string, commerceId: string) {
    await this.findOne(supplierId, commerceId);
    return this.prisma.supplierQuote.findMany({
      where: { supplierId, commerceId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { quotedAt: 'desc' },
    });
  }

  // Compara todas las cotizaciones vigentes de un producto entre proveedores,
  // ordenadas por precio, e incluye la variación % de cada proveedor respecto
  // a su cotización anterior — permite ver "Proveedor A es 4% más barato,
  // pero Proveedor B tarda menos" y "Proveedor B subió 12% en 14 días" en la
  // misma vista (sección 12 de WORKPLACE_VISION.md).
  async compareForProduct(productId: string, commerceId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, commerceId },
    });
    if (!product)
      throw new NotFoundException(this.i18n.t('suppliers.product_not_found'));

    const allQuotes = await this.prisma.supplierQuote.findMany({
      where: { productId, commerceId },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { quotedAt: 'desc' },
    });

    // Última cotización por proveedor (la primera que aparece, ya viene desc).
    const latestBySupplier = new Map<string, (typeof allQuotes)[number]>();
    for (const quote of allQuotes) {
      if (!latestBySupplier.has(quote.supplierId))
        latestBySupplier.set(quote.supplierId, quote);
    }

    const lookbackDate = new Date(
      Date.now() - PRICE_TREND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    const comparison = Array.from(latestBySupplier.values()).map((latest) => {
      // Cotización más antigua del mismo proveedor dentro de la ventana de
      // lookback, para medir cuánto varió el precio en ese período.
      const previous = allQuotes.find(
        (q) =>
          q.supplierId === latest.supplierId &&
          q.id !== latest.id &&
          q.quotedAt >= lookbackDate
      );
      const priceChangePct = previous
        ? Math.round(
            ((latest.priceUsd - previous.priceUsd) / previous.priceUsd) * 1000
          ) / 10
        : null;

      return {
        supplierId: latest.supplierId,
        supplierName: latest.supplier.name,
        priceUsd: latest.priceUsd,
        leadTimeDays: latest.leadTimeDays,
        available: latest.available,
        quotedAt: latest.quotedAt,
        priceChangePct,
        priceChangeLookbackDays: previous ? PRICE_TREND_LOOKBACK_DAYS : null,
      };
    });

    comparison.sort((a, b) => a.priceUsd - b.priceUsd);

    return {
      productId,
      productName: product.name,
      quotes: comparison,
      cheapestSupplierId: comparison[0]?.supplierId ?? null,
    };
  }
}
