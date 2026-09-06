import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountStatus } from '@prisma/client';

// Cuántas compras recientes por producto se promedian para el costo de
// reposición agregado — mismo criterio que PurchasesService.getReplacementCost.
const REPLACEMENT_COST_SAMPLE_SIZE = 5;

export interface ScoreComponent {
  key: string;
  label: string;
  score: number | null; // 0-100, null = sin datos suficientes para calcularlo
  weight: number;
  detail: Record<string, unknown>;
}

@Injectable()
export class BusinessHealthService {
  constructor(private readonly prisma: PrismaService) {}

  // Business Health Score (WORKPLACE_VISION.md sección 10): "no debe ser una
  // puntuación arbitraria, debe estar basada en indicadores reales". Cada
  // componente se calcula solo si hay datos reales para hacerlo — si faltan,
  // se excluye del promedio (no se asume un valor) y la confianza general
  // baja en proporción, en vez de aparentar precisión que no existe.
  async getScore(commerceId: string) {
    const [marginComponent, priceGuardComponent, receivablesComponent, payablesComponent] =
      await Promise.all([
        this.calculateMarginComponent(commerceId),
        this.calculatePriceGuardComponent(commerceId),
        this.calculateReceivablesComponent(commerceId),
        this.calculatePayablesComponent(commerceId),
      ]);

    const components = [marginComponent, priceGuardComponent, receivablesComponent, payablesComponent];
    const withData = components.filter((c) => c.score !== null);

    const overallScore =
      withData.length === 0
        ? null
        : Math.round(
            withData.reduce((sum, c) => sum + c.score! * c.weight, 0) /
              withData.reduce((sum, c) => sum + c.weight, 0),
          );

    // Confianza: cuántos de los 4 componentes tienen datos reales. Con 1/4
    // componentes, el score existe pero se debe mostrar con una advertencia
    // clara de que es poco representativo todavía.
    const confidence = Math.round((withData.length / components.length) * 100);

    return {
      commerceId,
      score: overallScore,
      confidence,
      rating: this.ratingFor(overallScore),
      components,
    };
  }

  private ratingFor(score: number | null): string {
    if (score === null) return 'SIN_DATOS';
    if (score >= 80) return 'SALUDABLE';
    if (score >= 60) return 'ACEPTABLE';
    if (score >= 40) return 'EN_RIESGO';
    return 'CRITICO';
  }

  // ── Margen de reposición promedio del comercio ──────────────────────────────
  // Compara, para cada producto con compras registradas, el margen sobre
  // costo de reposición (promedio de las últimas compras) contra su precio
  // actual. 100 = margen de reposición saludable en todos los productos con
  // datos; 0 = vendiendo a pérdida sobre costo de reposición en promedio.
  private async calculateMarginComponent(commerceId: string): Promise<ScoreComponent> {
    const products = await this.prisma.product.findMany({
      where: { commerceId, purchases: { some: {} } },
      select: { id: true, price: true },
    });

    if (products.length === 0) {
      return {
        key: 'replacement_margin',
        label: 'Margen de reposición',
        score: null,
        weight: 1,
        detail: { reason: 'Sin compras registradas todavía', productsWithData: 0 },
      };
    }

    const margins: number[] = [];
    for (const product of products) {
      const recentPurchases = await this.prisma.purchase.findMany({
        where: { productId: product.id, commerceId },
        orderBy: { purchasedAt: 'desc' },
        take: REPLACEMENT_COST_SAMPLE_SIZE,
        select: { unitCostUsd: true },
      });
      if (recentPurchases.length === 0 || product.price <= 0) continue;

      const avgCost =
        recentPurchases.reduce((sum, p) => sum + p.unitCostUsd, 0) / recentPurchases.length;
      const marginPct = ((product.price - avgCost) / product.price) * 100;
      margins.push(marginPct);
    }

    if (margins.length === 0) {
      return {
        key: 'replacement_margin',
        label: 'Margen de reposición',
        score: null,
        weight: 1,
        detail: { reason: 'Sin compras registradas todavía', productsWithData: 0 },
      };
    }

    const avgMarginPct = margins.reduce((sum, m) => sum + m, 0) / margins.length;
    // Normalización: 0% de margen = score 0, 40%+ de margen = score 100.
    // 40% como techo es un umbral razonable para negocios pequeños, no un
    // estándar contable — documentado así para no aparentar más precisión.
    const score = Math.max(0, Math.min(100, Math.round((avgMarginPct / 40) * 100)));

    return {
      key: 'replacement_margin',
      label: 'Margen de reposición',
      score,
      weight: 1,
      detail: { averageMarginPct: Math.round(avgMarginPct * 10) / 10, productsWithData: margins.length },
    };
  }

  // ── Cumplimiento de Price Guard ──────────────────────────────────────────────
  // % de productos con compras registradas cuyo precio actual está en o por
  // encima del mínimo recomendado (costo de reposición / (1 - margen mínimo)).
  private async calculatePriceGuardComponent(commerceId: string): Promise<ScoreComponent> {
    const settings = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
      select: { minMarginPct: true },
    });
    const defaultMinMarginPct = settings?.minMarginPct ?? 15;

    const products = await this.prisma.product.findMany({
      where: { commerceId, purchases: { some: {} } },
      select: { id: true, price: true, minMarginPct: true },
    });

    if (products.length === 0) {
      return {
        key: 'price_guard_compliance',
        label: 'Cumplimiento de Price Guard',
        score: null,
        weight: 1,
        detail: { reason: 'Sin compras registradas todavía', productsEvaluated: 0 },
      };
    }

    let evaluated = 0;
    let compliant = 0;
    for (const product of products) {
      const recentPurchases = await this.prisma.purchase.findMany({
        where: { productId: product.id, commerceId },
        orderBy: { purchasedAt: 'desc' },
        take: REPLACEMENT_COST_SAMPLE_SIZE,
        select: { unitCostUsd: true },
      });
      if (recentPurchases.length === 0) continue;

      const avgCost =
        recentPurchases.reduce((sum, p) => sum + p.unitCostUsd, 0) / recentPurchases.length;
      const minMarginPct = product.minMarginPct ?? defaultMinMarginPct;
      const marginFraction = minMarginPct / 100;
      const minPrice = marginFraction >= 1 ? Infinity : avgCost / (1 - marginFraction);

      evaluated++;
      if (product.price >= minPrice) compliant++;
    }

    if (evaluated === 0) {
      return {
        key: 'price_guard_compliance',
        label: 'Cumplimiento de Price Guard',
        score: null,
        weight: 1,
        detail: { reason: 'Sin compras registradas todavía', productsEvaluated: 0 },
      };
    }

    const score = Math.round((compliant / evaluated) * 100);

    return {
      key: 'price_guard_compliance',
      label: 'Cumplimiento de Price Guard',
      score,
      weight: 1,
      detail: { compliantProducts: compliant, productsEvaluated: evaluated },
    };
  }

  // ── Salud de cuentas por cobrar ──────────────────────────────────────────────
  // % de cuentas por cobrar PENDING que NO están vencidas (dueDate < hoy).
  private async calculateReceivablesComponent(commerceId: string): Promise<ScoreComponent> {
    return this.calculateAccountHealthComponent(
      'receivables_health',
      'Salud de cuentas por cobrar',
      this.prisma.accountReceivable,
      commerceId,
    );
  }

  // ── Salud de cuentas por pagar ───────────────────────────────────────────────
  // % de cuentas por pagar PENDING que NO están vencidas — pagar tarde
  // erosiona la relación con proveedores aunque libere caja en el corto plazo.
  private async calculatePayablesComponent(commerceId: string): Promise<ScoreComponent> {
    return this.calculateAccountHealthComponent(
      'payables_health',
      'Salud de cuentas por pagar',
      this.prisma.accountPayable,
      commerceId,
    );
  }

  private async calculateAccountHealthComponent(
    key: string,
    label: string,
    model: { findMany: (args: any) => Promise<any[]> },
    commerceId: string,
  ): Promise<ScoreComponent> {
    const pending = await model.findMany({
      where: { commerceId, status: AccountStatus.PENDING },
      select: { dueDate: true },
    });

    if (pending.length === 0) {
      return {
        key,
        label,
        score: null,
        weight: 1,
        detail: { reason: 'Sin cuentas pendientes registradas', pendingCount: 0 },
      };
    }

    const now = new Date();
    const overdue = pending.filter((p) => p.dueDate && p.dueDate < now).length;
    const score = Math.round(((pending.length - overdue) / pending.length) * 100);

    return {
      key,
      label,
      score,
      weight: 1,
      detail: { pendingCount: pending.length, overdueCount: overdue },
    };
  }
}
