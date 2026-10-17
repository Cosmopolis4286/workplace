import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { QueryAnalyticsDto } from '../dto/query-analytics.dto';
import { CustomerSegment } from '@prisma/client';
import {
  AnalyticsAccountStrategy,
  AnalyticsDashboardTrends,
} from './analytics-overview.strategy.interface';
import {
  startOfDay,
  endOfDay,
  getPeriodRange,
  getPreviousPeriodRange,
  pct,
} from './analytics.helpers';

/**
 * Vista de SUPERADMIN/ADMIN: mismo contrato que CommerceAnalyticsStrategy,
 * pero agregado sobre TODA la plataforma (sin filtrar por commerceId). Un
 * admin no "tiene" un comercio propio — antes de esta estrategia caía en
 * CommerceAnalyticsStrategy vía el branch por-defecto de
 * AnalyticsService.resolveStrategy(), y como CommerceResolverService no
 * encuentra un Commerce para ese userId, todos los KPIs quedaban en cero.
 *
 * "Cliente nuevo" a nivel plataforma se redefine como User nuevo (no
 * Customer de un comercio, que es un concepto por-comercio sin sentido
 * agregado). customerSegments igual se agrega sobre todos los Customer de
 * todos los comercios: sigue siendo información útil (cuántos VIP/Premium/
 * Regular/Nuevos hay en total), solo que ya no acotado a uno.
 */
@Injectable()
export class PlatformAnalyticsStrategy implements AnalyticsAccountStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(_userId: string, dto: QueryAnalyticsDto) {
    const { period = '30d', compareWith = 'previous', dateFrom, dateTo } = dto;
    const current = getPeriodRange(period, dateFrom, dateTo);
    const previous = getPreviousPeriodRange(period, compareWith, current);

    const [
      kpis,
      prevKpis,
      revenueTrend,
      ordersByHour,
      topProducts,
      customerSegments,
      performance,
    ] = await Promise.all([
      this.getKpis(current.from, current.to),
      previous ? this.getKpis(previous.from, previous.to) : null,
      this.getRevenueTrend(current.from, current.to, period),
      this.getOrdersByHour(current.from, current.to),
      this.getTopProducts(current.from, current.to),
      this.getCustomerSegments(),
      this.getPerformanceMetrics(current.from, current.to),
    ]);

    return {
      period,
      compareWith,
      dateRange: {
        from: current.from.toISOString(),
        to: current.to.toISOString(),
      },
      previousDateRange: previous
        ? { from: previous.from.toISOString(), to: previous.to.toISOString() }
        : null,
      kpis: {
        totalRevenue: kpis.totalRevenue,
        totalRevenueChange: pct(
          kpis.totalRevenue,
          prevKpis?.totalRevenue ?? null
        ),
        totalOrders: kpis.totalOrders,
        totalOrdersChange: pct(kpis.totalOrders, prevKpis?.totalOrders ?? null),
        avgTicket: kpis.avgTicket,
        avgTicketChange: pct(kpis.avgTicket, prevKpis?.avgTicket ?? null),
        newCustomers: kpis.newCustomers,
        newCustomersChange: pct(
          kpis.newCustomers,
          prevKpis?.newCustomers ?? null
        ),
      },
      revenueTrend,
      ordersByHour,
      topProducts,
      customerSegments,
      performance,
    };
  }

  // ─── KPIs (toda la plataforma, sin filtro commerceId) ─────────────────────

  private async getKpis(from: Date, to: Date) {
    const [revenueData, totalOrders, newUsers] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', createdAt: { gte: from, lte: to } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    const totalRevenue =
      Math.round(Number(revenueData._sum.total ?? 0) * 100) / 100;
    const deliveredCount = revenueData._count.id;
    const avgTicket =
      deliveredCount > 0
        ? Math.round((totalRevenue / deliveredCount) * 100) / 100
        : 0;

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      newCustomers: newUsers,
    };
  }

  // ─── Revenue trend (daily buckets, toda la plataforma) ────────────────────

  private async getRevenueTrend(from: Date, to: Date, period: string) {
    const orders = await this.prisma.order.findMany({
      where: { status: 'DELIVERED', createdAt: { gte: from, lte: to } },
      select: { total: true, createdAt: true },
    });

    const days =
      Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const labels: string[] = [];
    const values: number[] = [];

    const fmt =
      period === '1y'
        ? (d: Date) =>
            d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
        : period === 'today'
          ? (d: Date) => `${d.getHours()}:00`
          : (d: Date) =>
              d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

    if (period === 'today') {
      const hourly: number[] = Array(24).fill(0);
      orders.forEach((o) => {
        const h = new Date(o.createdAt).getHours();
        hourly[h] += Number(o.total);
      });
      const currentHour = new Date().getHours();
      for (let h = 6; h <= Math.min(currentHour, 23); h++) {
        labels.push(`${h}:00`);
        values.push(Math.round(hourly[h] * 100) / 100);
      }
      return { labels, values };
    }

    if (period === '1y') {
      const monthly: Record<string, number> = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date(from);
        d.setMonth(d.getMonth() + i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthly[key] = 0;
      }
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthly) monthly[key] += Number(o.total);
      });
      for (const [key, val] of Object.entries(monthly)) {
        const [year, month] = key.split('-').map(Number);
        labels.push(fmt(new Date(year, month, 1)));
        values.push(Math.round(val * 100) / 100);
      }
    } else {
      for (let i = 0; i < days; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        labels.push(fmt(d));
        values.push(0);
      }
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        const idx = Math.floor(
          (startOfDay(d).getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (idx >= 0 && idx < values.length) values[idx] += Number(o.total);
      });
      values.forEach((_, i) => {
        values[i] = Math.round(values[i] * 100) / 100;
      });
    }

    return { labels, values };
  }

  // ─── Orders by hour (toda la plataforma) ──────────────────────────────────

  private async getOrdersByHour(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      select: { createdAt: true },
    });

    const hours: number[] = Array(24).fill(0);
    orders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      hours[h]++;
    });

    const labels: string[] = [];
    const values: number[] = [];
    for (let h = 6; h <= 23; h++) {
      labels.push(`${h}:00`);
      values.push(hours[h]);
    }

    return { labels, values };
  }

  // ─── Top products (más vendidos entre todos los comercios) ───────────────

  private async getTopProducts(from: Date, to: Date) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: { status: 'DELIVERED', createdAt: { gte: from, lte: to } },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    return {
      labels: items.map((i) => i.productName),
      values: items.map((i) => i._sum.quantity ?? 0),
      revenue: items.map((i) => Math.round((i._sum.subtotal ?? 0) * 100) / 100),
    };
  }

  // ─── Customer segments (agregado de todos los comercios) ──────────────────

  private async getCustomerSegments() {
    const segments = await this.prisma.customer.groupBy({
      by: ['segment'],
      _count: { id: true },
    });

    const segmentMap: Record<CustomerSegment, string> = {
      VIP: 'VIP',
      PREMIUM: 'Premium',
      REGULAR: 'Regular',
      NEW: 'Nuevos',
    };

    const allSegments: CustomerSegment[] = ['VIP', 'PREMIUM', 'REGULAR', 'NEW'];
    const counts = allSegments.map((s) => ({
      label: segmentMap[s],
      count: segments.find((sg) => sg.segment === s)?._count.id ?? 0,
    }));

    return {
      labels: counts.map((c) => c.label),
      values: counts.map((c) => c.count),
    };
  }

  // ─── Dashboard KPI sparklines (7 días, toda la plataforma) ────────────────

  async getDashboardTrends(_userId: string): Promise<AnalyticsDashboardTrends> {
    const days = 7;
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const labels: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      labels.push(
        d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
      );
    }

    const [orders, newUsers, stockSnapshots] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true, total: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true },
      }),
      // Bajo stock agregado: suma del lowStockCount de todos los comercios
      // por día (mismo día calendario, distintos commerceId).
      this.prisma.productStockSnapshot.findMany({
        where: { date: { gte: from, lte: today } },
        select: { date: true, lowStockCount: true },
      }),
    ]);

    const dayIndex = (date: Date) =>
      Math.floor(
        (startOfDay(new Date(date)).getTime() - from.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    const bucketByDay = (rows: { createdAt: Date }[]): number[] => {
      const values = Array(days).fill(0);
      rows.forEach((r) => {
        const idx = dayIndex(r.createdAt);
        if (idx >= 0 && idx < days) values[idx]++;
      });
      return values;
    };

    const ordersValues = bucketByDay(orders);
    const usersValues = bucketByDay(newUsers);

    const salesValues = Array(days).fill(0);
    orders.forEach((o) => {
      const idx = dayIndex(o.createdAt);
      if (idx >= 0 && idx < days) salesValues[idx] += Number(o.total);
    });

    const lowStockValues: (number | null)[] = labels.map((_, i) => {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const dayKey = startOfDay(d).getTime();
      const snapsForDay = stockSnapshots.filter(
        (s) => startOfDay(new Date(s.date)).getTime() === dayKey
      );
      if (snapsForDay.length === 0) return null;
      return snapsForDay.reduce((sum, s) => sum + s.lowStockCount, 0);
    });

    return {
      labels,
      salesToday: salesValues.map((v) => Math.round(v * 100) / 100),
      activeOrders: ordersValues,
      newCustomers: usersValues,
      lowStock: lowStockValues,
    };
  }

  // ─── Performance metrics (promedios/sumas entre toda la plataforma) ───────

  private async getPerformanceMetrics(from: Date, to: Date) {
    const [settingsAgg, customersAgg, appointments, activeCommerces] =
      await Promise.all([
        this.prisma.commerceSettings.aggregate({
          _avg: { avgPrepTime: true, avgDeliveryTime: true },
        }),
        this.prisma.customer.aggregate({
          where: { isActive: true },
          _avg: { totalSpent: true },
          _count: { id: true },
          _sum: { totalSpent: true, totalOrders: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['status'],
          where: { date: { gte: from, lte: to } },
          _count: { id: true },
        }),
        this.prisma.commerce.count(),
      ]);

    const totalInPeriod = appointments.reduce((sum, a) => sum + a._count.id, 0);
    const cancelled =
      appointments.find((a) => a.status === 'CANCELLED')?._count.id ?? 0;
    const noShow =
      appointments.find((a) => a.status === 'NO_SHOW')?._count.id ?? 0;
    const cancellationRate =
      totalInPeriod > 0
        ? Math.round(((cancelled + noShow) / totalInPeriod) * 1000) / 10
        : 0;

    const totalCustomers = customersAgg._count.id;
    const totalOrders = Number(customersAgg._sum.totalOrders ?? 0);
    const totalRevenue = Number(customersAgg._sum.totalSpent ?? 0);
    const avgTicket =
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0;
    const avgOrderFrequency =
      totalCustomers > 0
        ? Math.round((totalOrders / totalCustomers) * 10) / 10
        : 0;
    const clv = Number(customersAgg._avg.totalSpent ?? 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [newInLast30, returning] = await Promise.all([
      this.prisma.customer.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({ where: { totalOrders: { gt: 1 } } }),
    ]);

    const retentionRate =
      totalCustomers > 0
        ? Math.round((returning / totalCustomers) * 1000) / 10
        : 0;

    const products = await this.prisma.product.aggregate({
      _avg: { price: true, cost: true },
    });
    const avgPrice = Number(products._avg.price ?? 0);
    const avgCost = Number(products._avg.cost ?? 0);
    const grossMargin =
      avgPrice > 0
        ? Math.round(((avgPrice - avgCost) / avgPrice) * 1000) / 10
        : 0;

    return {
      operational: {
        avgPrepTime: Math.round(settingsAgg._avg.avgPrepTime ?? 0),
        avgDeliveryTime: Math.round(settingsAgg._avg.avgDeliveryTime ?? 0),
        cancellationRate,
        cancellations: cancelled + noShow,
        totalInPeriod,
      },
      growth: {
        newCustomers: newInLast30,
        retentionRate,
        clv: Math.round(clv * 100) / 100,
        orderFrequency: avgOrderFrequency,
        totalCustomers,
      },
      financial: {
        grossMargin,
        avgTicket,
        totalRevenue,
        totalOrders,
      },
      // Campo extra informativo para la vista de plataforma — no rompe el
      // contrato porque el frontend accede a los campos existentes por
      // nombre, no valida shape estricto.
      activeCommerces,
    };
  }
}
