import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../../common/commerce-resolver/commerce-resolver.service';
import { QueryAnalyticsDto } from '../dto/query-analytics.dto';
import { CustomerSegment } from '@prisma/client';
import { AnalyticsAccountStrategy, AnalyticsDashboardTrends } from './analytics-overview.strategy.interface';
import {
  startOfDay,
  endOfDay,
  getPeriodRange,
  getPreviousPeriodRange,
  pct,
} from './analytics.helpers';

@Injectable()
export class CommerceAnalyticsStrategy implements AnalyticsAccountStrategy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  private async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  async getOverview(userId: string, dto: QueryAnalyticsDto) {
    const { period = '30d', compareWith = 'previous', dateFrom, dateTo } = dto;
    const current = getPeriodRange(period, dateFrom, dateTo);
    const previous = getPreviousPeriodRange(period, compareWith, current);

    const commerceId = await this.getCommerceId(userId);

    const [
      kpis,
      prevKpis,
      revenueTrend,
      ordersByHour,
      topProducts,
      customerSegments,
      performance,
    ] = await Promise.all([
      this.getKpis(commerceId, current.from, current.to),
      previous ? this.getKpis(commerceId, previous.from, previous.to) : null,
      this.getRevenueTrend(commerceId, current.from, current.to, period),
      this.getOrdersByHour(commerceId, current.from, current.to),
      this.getTopProducts(commerceId, current.from, current.to),
      this.getCustomerSegments(commerceId),
      this.getPerformanceMetrics(commerceId, current.from, current.to),
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

  // ─── KPIs ────────────────────────────────────────────────────────────────

  private async getKpis(commerceId: string, from: Date, to: Date) {
    // Revenue and orders from appointments (completed ones represent served customers)
    const [completedAppointments, totalOrders, newCustomers, customers] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: {
            commerceId,
            status: 'COMPLETED',
            date: { gte: from, lte: to },
          },
          select: { id: true },
        }),
        this.prisma.appointment.count({
          where: {
            commerceId,
            date: { gte: from, lte: to },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        }),
        this.prisma.customer.count({
          where: { commerceId, createdAt: { gte: from, lte: to } },
        }),
        this.prisma.customer.aggregate({
          where: { commerceId },
          _sum: { totalSpent: true, totalOrders: true },
          _count: { id: true },
        }),
      ]);

    // Revenue: sum of totalSpent from customers updated in period
    const revenueData = await this.prisma.customer.aggregate({
      where: { commerceId, updatedAt: { gte: from, lte: to } },
      _sum: { totalSpent: true },
    });

    const totalRevenue = Number(revenueData._sum.totalSpent ?? 0);
    const avgTicket =
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0;

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      newCustomers,
      completedAppointments: completedAppointments.length,
    };
  }

  // ─── Revenue trend (daily buckets) ───────────────────────────────────────

  private async getRevenueTrend(
    commerceId: string,
    from: Date,
    to: Date,
    period: string
  ) {
    // Aggregate customer spending updates by day
    const customers = await this.prisma.customer.findMany({
      where: { commerceId, updatedAt: { gte: from, lte: to } },
      select: { totalSpent: true, updatedAt: true, createdAt: true },
    });

    // Build daily buckets
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

    // For today, group by hour
    if (period === 'today') {
      const hourly: number[] = Array(24).fill(0);
      customers.forEach((c) => {
        const h = new Date(c.updatedAt).getHours();
        hourly[h] += Number(c.totalSpent);
      });
      const currentHour = new Date().getHours();
      for (let h = 6; h <= Math.min(currentHour, 23); h++) {
        labels.push(`${h}:00`);
        values.push(Math.round(hourly[h] * 100) / 100);
      }
      return { labels, values };
    }

    // For year period, group by month
    if (period === '1y') {
      const monthly: Record<string, number> = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date(from);
        d.setMonth(d.getMonth() + i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthly[key] = 0;
      }
      customers.forEach((c) => {
        const d = new Date(c.updatedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthly) monthly[key] += Number(c.totalSpent);
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
      customers.forEach((c) => {
        const d = new Date(c.updatedAt);
        const idx = Math.floor(
          (startOfDay(d).getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (idx >= 0 && idx < values.length)
          values[idx] += Number(c.totalSpent);
      });
      values.forEach((_, i) => {
        values[i] = Math.round(values[i] * 100) / 100;
      });
    }

    return { labels, values };
  }

  // ─── Orders by hour ──────────────────────────────────────────────────────

  private async getOrdersByHour(commerceId: string, from: Date, to: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        commerceId,
        date: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { date: true },
    });

    const hours: number[] = Array(24).fill(0);
    appointments.forEach((a) => {
      const h = new Date(a.date).getHours();
      hours[h]++;
    });

    // Only include business hours 6-23
    const labels: string[] = [];
    const values: number[] = [];
    for (let h = 6; h <= 23; h++) {
      labels.push(`${h}:00`);
      values.push(hours[h]);
    }

    return { labels, values };
  }

  // ─── Top products ─────────────────────────────────────────────────────────

  private async getTopProducts(commerceId: string, _from: Date, _to: Date) {
    // Use stock movement as proxy: low stock / products with most turnover
    const products = await this.prisma.product.findMany({
      where: { commerceId, status: { not: 'UNAVAILABLE' } },
      select: { name: true, stock: true, maxStock: true, price: true },
      orderBy: { stock: 'asc' },
      take: 10,
    });

    // Score by (maxStock - currentStock) as units sold proxy
    const scored = products
      .map((p) => ({
        name: p.name,
        unitsSold: Math.max(0, (p.maxStock ?? 0) - p.stock),
        revenue: Math.max(0, (p.maxStock ?? 0) - p.stock) * Number(p.price),
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    return {
      labels: scored.map((p) => p.name),
      values: scored.map((p) => p.unitsSold),
      revenue: scored.map((p) => Math.round(p.revenue * 100) / 100),
    };
  }

  // ─── Customer segments ───────────────────────────────────────────────────

  private async getCustomerSegments(commerceId: string) {
    const segments = await this.prisma.customer.groupBy({
      by: ['segment'],
      where: { commerceId },
      _count: { id: true },
    });

    const segmentMap: Record<CustomerSegment, string> = {
      VIP: 'VIP',
      PREMIUM: 'Premium',
      REGULAR: 'Regular',
      NEW: 'Nuevos',
    };

    const allSegments: CustomerSegment[] = [
      'VIP',
      'PREMIUM',
      'REGULAR',
      'NEW',
    ];
    const counts = allSegments.map((s) => ({
      label: segmentMap[s],
      count: segments.find((sg) => sg.segment === s)?._count.id ?? 0,
    }));

    return {
      labels: counts.map((c) => c.label),
      values: counts.map((c) => c.count),
    };
  }

  // ─── Dashboard KPI sparklines (7 días, datos reales) ──────────────────────

  async getDashboardTrends(userId: string): Promise<AnalyticsDashboardTrends> {
    const commerceId = await this.getCommerceId(userId);

    const days = 7;
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const labels: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      labels.push(d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
    }

    const [orders, customers, stockSnapshots] = await Promise.all([
      this.prisma.order.findMany({
        where: { commerceId, createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true, total: true },
      }),
      this.prisma.customer.findMany({
        where: { commerceId, createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true },
      }),
      this.prisma.productStockSnapshot.findMany({
        where: { commerceId, date: { gte: from, lte: today } },
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
    const customersValues = bucketByDay(customers);

    const salesValues = Array(days).fill(0);
    orders.forEach((o) => {
      const idx = dayIndex(o.createdAt);
      if (idx >= 0 && idx < days) salesValues[idx] += Number(o.total);
    });

    // Bajo stock: usar el snapshot del día si existe; si falta (días sin
    // job corrido aún), null para que el frontend lo distinga de un 0 real.
    const lowStockValues: (number | null)[] = labels.map((_, i) => {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const snap = stockSnapshots.find(
        (s) => startOfDay(new Date(s.date)).getTime() === d.getTime()
      );
      return snap ? snap.lowStockCount : null;
    });

    return {
      labels,
      salesToday: salesValues.map((v) => Math.round(v * 100) / 100),
      activeOrders: ordersValues,
      newCustomers: customersValues,
      lowStock: lowStockValues,
    };
  }

  // ─── Performance metrics ─────────────────────────────────────────────────

  private async getPerformanceMetrics(
    commerceId: string,
    from: Date,
    to: Date
  ) {
    const [settings, customers, appointments] = await Promise.all([
      this.prisma.commerceSettings.findUnique({ where: { commerceId } }),
      this.prisma.customer.aggregate({
        where: { commerceId, isActive: true },
        _avg: { totalSpent: true, totalOrders: true },
        _count: { id: true },
        _sum: { totalSpent: true, totalOrders: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { commerceId, date: { gte: from, lte: to } },
        _count: { id: true },
      }),
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

    const totalCustomers = customers._count.id;
    const totalOrders = Number(customers._sum.totalOrders ?? 0);
    const totalRevenue = Number(customers._sum.totalSpent ?? 0);
    const avgTicket =
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0;
    const avgOrderFrequency =
      totalCustomers > 0
        ? Math.round((totalOrders / totalCustomers) * 10) / 10
        : 0;
    const clv = Number(customers._avg.totalSpent ?? 0);

    // New customers in last 30 days for retention calc
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [newInLast30, returning] = await Promise.all([
      this.prisma.customer.count({
        where: { commerceId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { commerceId, totalOrders: { gt: 1 } },
      }),
    ]);

    const retentionRate =
      totalCustomers > 0
        ? Math.round((returning / totalCustomers) * 1000) / 10
        : 0;

    // Financial: use product data for gross margin
    const products = await this.prisma.product.aggregate({
      where: { commerceId },
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
        avgPrepTime: settings?.avgPrepTime ?? 0,
        avgDeliveryTime: settings?.avgDeliveryTime ?? 0,
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
    };
  }
}
