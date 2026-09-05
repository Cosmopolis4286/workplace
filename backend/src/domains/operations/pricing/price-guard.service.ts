import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { PurchasesService } from '../purchases/purchases.service';

@Injectable()
export class PriceGuardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchases: PurchasesService,
    private readonly i18n: I18nService,
  ) {}

  // Costo de reposición "efectivo" para Price Guard: el promedio de compras
  // recientes si existen, si no el costo histórico cargado a mano — siempre
  // hay un número con el que calcular, aunque no sea el ideal. Ver
  // WORKPLACE_VISION.md sección 5 (Costo de reposición) y 6 (Price Guard).
  private effectiveReplacementCost(replacement: {
    hasPurchaseData: boolean;
    averageReplacementCostUsd: number | null;
    historicalCost: number;
  }): number {
    return replacement.hasPurchaseData && replacement.averageReplacementCostUsd !== null
      ? replacement.averageReplacementCostUsd
      : replacement.historicalCost;
  }

  private async resolveMinMarginPct(productId: string, commerceId: string): Promise<number> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, commerceId },
      select: { minMarginPct: true },
    });
    if (!product) throw new NotFoundException(this.i18n.t('purchases.product_not_found'));
    if (product.minMarginPct !== null && product.minMarginPct !== undefined) {
      return product.minMarginPct;
    }
    const settings = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
      select: { minMarginPct: true },
    });
    return settings?.minMarginPct ?? 15;
  }

  // Precio mínimo recomendado = costo / (1 - margen). Ej.: costo $13, margen
  // mínimo 20% -> 13 / 0.8 = $16.25 (mismo ejemplo del audit estratégico).
  private minPriceFor(cost: number, minMarginPct: number): number {
    const marginFraction = minMarginPct / 100;
    if (marginFraction >= 1) return Infinity; // margen >=100% es matemáticamente imposible de alcanzar
    return Math.round((cost / (1 - marginFraction)) * 100) / 100;
  }

  async getMinPrice(productId: string, commerceId: string) {
    const replacement = await this.purchases.getReplacementCost(productId, commerceId);
    const minMarginPct = await this.resolveMinMarginPct(productId, commerceId);
    const cost = this.effectiveReplacementCost(replacement);
    const minPrice = this.minPriceFor(cost, minMarginPct);

    return {
      productId,
      currentPrice: replacement.price,
      replacementCostUsd: cost,
      minMarginPct,
      minPrice,
      belowMinPrice: replacement.price < minPrice,
      usingReplacementCost: replacement.hasPurchaseData,
    };
  }

  // "¿Qué pasa si el tipo de cambio sube X%?" — aplica el incremento sobre
  // el costo de reposición efectivo y recalcula el precio mínimo y el margen
  // resultante con el precio ACTUAL, sin tocar ningún dato real todavía.
  async simulatePriceChange(productId: string, commerceId: string, costIncreasePct: number) {
    const replacement = await this.purchases.getReplacementCost(productId, commerceId);
    const minMarginPct = await this.resolveMinMarginPct(productId, commerceId);
    const currentCost = this.effectiveReplacementCost(replacement);
    const simulatedCost = Math.round(currentCost * (1 + costIncreasePct / 100) * 100) / 100;
    const simulatedMinPrice = this.minPriceFor(simulatedCost, minMarginPct);

    const price = replacement.price;
    const simulatedMarginPct =
      price > 0 ? Math.round(((price - simulatedCost) / price) * 1000) / 10 : null;

    return {
      productId,
      currentPrice: price,
      currentCostUsd: currentCost,
      costIncreasePct,
      simulatedCostUsd: simulatedCost,
      simulatedMinPrice,
      simulatedMarginPct,
      belowSimulatedMinPrice: price < simulatedMinPrice,
    };
  }
}
