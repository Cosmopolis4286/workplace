import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Ventanas de comparación: "ahora" son los últimos WINDOW_DAYS días, "antes"
// los WINDOW_DAYS días previos a esos. Ver WORKPLACE_VISION.md sección 7 —
// deliberadamente NO es un índice de inflación oficial, es una métrica
// operativa basada 100% en lo que el propio comercio compra.
const WINDOW_DAYS = 30;

interface BasketItem {
  productId: string;
  productName: string;
  quantity: number; // cantidad comprada en la ventana actual (fija la "cesta")
  currentUnitCostUsd: number; // costo promedio ponderado en la ventana actual
  previousUnitCostUsd: number; // costo promedio ponderado en la ventana anterior
}

@Injectable()
export class PurchasingPowerService {
  constructor(private readonly prisma: PrismaService) {}

  // Compara el costo de reponer la MISMA cesta de productos (los que el
  // comercio compró en los últimos 30 días, ponderados por esa cantidad)
  // usando los precios de hace 30-60 días vs. los precios actuales. Aísla el
  // efecto de precio del efecto de "compré más o menos cantidad".
  async getPurchasingPower(commerceId: string) {
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(currentWindowStart.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [currentPurchases, previousPurchases] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { commerceId, purchasedAt: { gte: currentWindowStart, lte: now } },
        select: { productId: true, quantity: true, unitCostUsd: true, product: { select: { name: true } } },
      }),
      this.prisma.purchase.findMany({
        where: { commerceId, purchasedAt: { gte: previousWindowStart, lt: currentWindowStart } },
        select: { productId: true, quantity: true, unitCostUsd: true },
      }),
    ]);

    if (currentPurchases.length === 0) {
      return {
        commerceId,
        hasData: false,
        reason: `Sin compras registradas en los últimos ${WINDOW_DAYS} días`,
        basketSize: 0,
        purchasingPowerChangePct: null,
        basket: [],
      };
    }

    // Costo promedio ponderado por producto en cada ventana.
    const currentByProduct = this.weightedAverageByProduct(currentPurchases);
    const previousByProduct = this.weightedAverageByProduct(previousPurchases);

    const basket: BasketItem[] = [];
    for (const [productId, current] of currentByProduct) {
      const previous = previousByProduct.get(productId);
      // Solo se puede comparar un producto si también se compró en la
      // ventana anterior — no se inventa un costo "antes" que no existe.
      if (!previous) continue;
      basket.push({
        productId,
        productName: current.productName,
        quantity: current.quantity,
        currentUnitCostUsd: current.avgCostUsd,
        previousUnitCostUsd: previous.avgCostUsd,
      });
    }

    if (basket.length === 0) {
      return {
        commerceId,
        hasData: false,
        reason: `Ninguno de los productos comprados en los últimos ${WINDOW_DAYS} días tiene una compra anterior con la que compararlo`,
        basketSize: 0,
        purchasingPowerChangePct: null,
        basket: [],
      };
    }

    // Valor de la MISMA cesta (cantidades de la ventana actual) a precios de
    // cada ventana — así la variación % refleja solo el cambio de precio.
    const valueAtPreviousPrices = basket.reduce((sum, item) => sum + item.quantity * item.previousUnitCostUsd, 0);
    const valueAtCurrentPrices = basket.reduce((sum, item) => sum + item.quantity * item.currentUnitCostUsd, 0);

    const purchasingPowerChangePct =
      valueAtPreviousPrices > 0
        ? Math.round(((valueAtCurrentPrices - valueAtPreviousPrices) / valueAtPreviousPrices) * 1000) / 10
        : null;

    return {
      commerceId,
      hasData: true,
      windowDays: WINDOW_DAYS,
      basketSize: basket.length,
      valueAtPreviousPrices: Math.round(valueAtPreviousPrices * 100) / 100,
      valueAtCurrentPrices: Math.round(valueAtCurrentPrices * 100) / 100,
      purchasingPowerChangePct,
      basket: basket
        .map((item) => ({
          ...item,
          changePct:
            item.previousUnitCostUsd > 0
              ? Math.round(((item.currentUnitCostUsd - item.previousUnitCostUsd) / item.previousUnitCostUsd) * 1000) / 10
              : null,
        }))
        .sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity)),
    };
  }

  private weightedAverageByProduct(
    purchases: Array<{ productId: string; quantity: number; unitCostUsd: number; product?: { name: string } }>,
  ): Map<string, { avgCostUsd: number; quantity: number; productName: string }> {
    const totals = new Map<string, { totalCost: number; totalQuantity: number; productName: string }>();

    for (const p of purchases) {
      const existing = totals.get(p.productId) ?? { totalCost: 0, totalQuantity: 0, productName: p.product?.name ?? '' };
      existing.totalCost += p.unitCostUsd * p.quantity;
      existing.totalQuantity += p.quantity;
      if (p.product?.name) existing.productName = p.product.name;
      totals.set(p.productId, existing);
    }

    const result = new Map<string, { avgCostUsd: number; quantity: number; productName: string }>();
    for (const [productId, t] of totals) {
      result.set(productId, {
        avgCostUsd: t.totalCost / t.totalQuantity,
        quantity: t.totalQuantity,
        productName: t.productName,
      });
    }
    return result;
  }
}
