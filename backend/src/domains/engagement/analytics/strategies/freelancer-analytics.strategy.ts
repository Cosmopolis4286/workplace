import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { QueryAnalyticsDto } from '../dto/query-analytics.dto';
import { ServiceRequestStatus } from '@prisma/client';
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
import { sum, toNumber } from '../../../../common/money/money';

const CLOSED = ServiceRequestStatus.CLOSED;
const OPEN_OR_CLOSED_NOT_CANCELLED: ServiceRequestStatus[] = [
  ServiceRequestStatus.PENDING,
  ServiceRequestStatus.SEEN,
  ServiceRequestStatus.CONTACTED,
  ServiceRequestStatus.CLOSED,
];

/**
 * Un freelancer no tiene Product/Order/Appointment/Customer — su unidad de
 * negocio es el Service y su "venta" es el ServiceRequest. Se reusa el mismo
 * contrato de respuesta que el comercio para no romper el frontend, mapeando
 * conceptualmente: pedido → solicitud, producto → servicio.
 */
@Injectable()
export class FreelancerAnalyticsStrategy implements AnalyticsAccountStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(providerId: string, dto: QueryAnalyticsDto) {
    const { period = '30d', compareWith = 'previous', dateFrom, dateTo } = dto;
    const current = getPeriodRange(period, dateFrom, dateTo);
    const previous = getPreviousPeriodRange(period, compareWith, current);

    const [
      kpis,
      prevKpis,
      revenueTrend,
      requestsByHour,
      topServices,
      performance,
    ] = await Promise.all([
      this.getFreelancerKpis(providerId, current.from, current.to),
      previous
        ? this.getFreelancerKpis(providerId, previous.from, previous.to)
        : null,
      this.getFreelancerRevenueTrend(
        providerId,
        current.from,
        current.to,
        period
      ),
      this.getFreelancerRequestsByHour(providerId, current.from, current.to),
      this.getFreelancerTopServices(providerId, current.from, current.to),
      this.getFreelancerPerformanceMetrics(
        providerId,
        current.from,
        current.to
      ),
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
        totalOrders: kpis.totalRequests,
        totalOrdersChange: pct(
          kpis.totalRequests,
          prevKpis?.totalRequests ?? null
        ),
        avgTicket: kpis.avgTicket,
        avgTicketChange: pct(kpis.avgTicket, prevKpis?.avgTicket ?? null),
        newCustomers: kpis.newClients,
        newCustomersChange: pct(kpis.newClients, prevKpis?.newClients ?? null),
      },
      revenueTrend,
      ordersByHour: requestsByHour,
      topProducts: topServices,
      // No hay segmentación de clientes (VIP/Premium/etc.) para freelancers:
      // el modelo Customer es exclusivo del módulo de comercio.
      customerSegments: { labels: [], values: [] },
      performance,
    };
  }

  private async getFreelancerKpis(providerId: string, from: Date, to: Date) {
    const [closedInPeriod, totalRequests, requesterIds] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: {
          providerId,
          status: CLOSED,
          statusUpdatedAt: { gte: from, lte: to },
        },
        select: { price: true },
      }),
      this.prisma.serviceRequest.count({
        where: {
          providerId,
          createdAt: { gte: from, lte: to },
          status: { in: OPEN_OR_CLOSED_NOT_CANCELLED },
        },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId, createdAt: { gte: from, lte: to } },
        select: { requesterId: true, clientPhone: true },
      }),
    ]);

    const totalRevenue = toNumber(sum(closedInPeriod.map((r) => r.price ?? 0)));
    const avgTicket =
      closedInPeriod.length > 0
        ? Math.round((totalRevenue / closedInPeriod.length) * 100) / 100
        : 0;
    // Clientes nuevos: identificados por usuario si autenticó, o por teléfono si fue anónimo.
    // (no se usa `distinct` de Prisma porque trata todos los requesterId=null
    // como un solo grupo, subcontando clientes anónimos distintos)
    const newClients = new Set(
      requesterIds.map((r) => r.requesterId ?? r.clientPhone)
    ).size;

    return { totalRevenue, totalRequests, avgTicket, newClients };
  }

  private async getFreelancerRevenueTrend(
    providerId: string,
    from: Date,
    to: Date,
    period: string
  ) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: {
        providerId,
        status: CLOSED,
        statusUpdatedAt: { gte: from, lte: to },
      },
      select: { price: true, statusUpdatedAt: true },
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
      closed.forEach((r) => {
        if (!r.statusUpdatedAt) return;
        hourly[new Date(r.statusUpdatedAt).getHours()] += Number(r.price ?? 0);
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
        monthly[`${d.getFullYear()}-${d.getMonth()}`] = 0;
      }
      closed.forEach((r) => {
        if (!r.statusUpdatedAt) return;
        const d = new Date(r.statusUpdatedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in monthly) monthly[key] += Number(r.price ?? 0);
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
      closed.forEach((r) => {
        if (!r.statusUpdatedAt) return;
        const d = new Date(r.statusUpdatedAt);
        const idx = Math.floor(
          (startOfDay(d).getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (idx >= 0 && idx < values.length)
          values[idx] += Number(r.price ?? 0);
      });
      values.forEach((_, i) => {
        values[i] = Math.round(values[i] * 100) / 100;
      });
    }

    return { labels, values };
  }

  private async getFreelancerRequestsByHour(
    providerId: string,
    from: Date,
    to: Date
  ) {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { providerId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });

    const hours: number[] = Array(24).fill(0);
    requests.forEach((r) => hours[new Date(r.createdAt).getHours()]++);

    const labels: string[] = [];
    const values: number[] = [];
    for (let h = 6; h <= 23; h++) {
      labels.push(`${h}:00`);
      values.push(hours[h]);
    }
    return { labels, values };
  }

  private async getFreelancerTopServices(
    providerId: string,
    from: Date,
    to: Date
  ) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: {
        providerId,
        status: CLOSED,
        statusUpdatedAt: { gte: from, lte: to },
      },
      select: { serviceName: true, price: true },
    });

    const byService = new Map<string, { count: number; revenue: number }>();
    for (const r of closed) {
      const cur = byService.get(r.serviceName) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(r.price ?? 0);
      byService.set(r.serviceName, cur);
    }

    const scored = Array.from(byService.entries())
      .map(([name, v]) => ({ name, unitsSold: v.count, revenue: v.revenue }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    return {
      labels: scored.map((s) => s.name),
      values: scored.map((s) => s.unitsSold),
      revenue: scored.map((s) => Math.round(s.revenue * 100) / 100),
    };
  }

  private async getFreelancerPerformanceMetrics(
    providerId: string,
    from: Date,
    to: Date
  ) {
    const [statusCounts, allRequests, avgResponseData] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        where: { providerId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId },
        select: {
          requesterId: true,
          clientPhone: true,
          status: true,
          price: true,
        },
      }),
      // Tiempo promedio de respuesta: de creación a primer cambio de estado (proxy: statusUpdatedAt)
      this.prisma.serviceRequest.findMany({
        where: {
          providerId,
          statusUpdatedAt: { not: null },
          createdAt: { gte: from, lte: to },
        },
        select: { createdAt: true, statusUpdatedAt: true },
      }),
    ]);

    const totalInPeriod = statusCounts.reduce((sum, s) => sum + s._count.id, 0);
    const cancelled =
      statusCounts.find((s) => s.status === 'CANCELLED')?._count.id ?? 0;
    const cancellationRate =
      totalInPeriod > 0
        ? Math.round((cancelled / totalInPeriod) * 1000) / 10
        : 0;

    const avgResponseHours =
      avgResponseData.length > 0
        ? avgResponseData.reduce((sum, r) => {
            const hours =
              (new Date(r.statusUpdatedAt!).getTime() -
                new Date(r.createdAt).getTime()) /
              (1000 * 60 * 60);
            return sum + Math.max(0, hours);
          }, 0) / avgResponseData.length
        : 0;

    // Identificador de cliente único: usuario autenticado o teléfono si fue anónimo.
    const clientKey = (r: {
      requesterId: string | null;
      clientPhone: string;
    }) => r.requesterId ?? r.clientPhone;
    const totalClients = new Set(allRequests.map(clientKey)).size;
    const closedRequests = allRequests.filter((r) => r.status === CLOSED);
    const totalRevenue = toNumber(sum(closedRequests.map((r) => r.price ?? 0)));
    const totalOrders = closedRequests.length;
    const avgTicket =
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0;

    const requestsByClient = new Map<string, number>();
    for (const r of allRequests) {
      const key = clientKey(r);
      requestsByClient.set(key, (requestsByClient.get(key) ?? 0) + 1);
    }
    const returningClients = Array.from(requestsByClient.values()).filter(
      (c) => c > 1
    ).length;
    const retentionRate =
      totalClients > 0
        ? Math.round((returningClients / totalClients) * 1000) / 10
        : 0;
    const avgOrderFrequency =
      totalClients > 0
        ? Math.round((allRequests.length / totalClients) * 10) / 10
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = await this.prisma.serviceRequest.findMany({
      where: { providerId, createdAt: { gte: thirtyDaysAgo } },
      select: { requesterId: true, clientPhone: true },
    });
    const newInLast30 = new Set(recentRequests.map(clientKey)).size;

    return {
      operational: {
        // No aplican a servicios (no hay preparación/entrega de un plato);
        // el frontend muestra '—' cuando el valor es 0/null.
        avgPrepTime: 0,
        avgDeliveryTime: Math.round(avgResponseHours * 60), // minutos, reusa el campo como "tiempo de respuesta"
        cancellationRate,
        cancellations: cancelled,
        totalInPeriod,
      },
      growth: {
        newCustomers: newInLast30,
        retentionRate,
        clv:
          totalClients > 0
            ? Math.round((totalRevenue / totalClients) * 100) / 100
            : 0,
        orderFrequency: avgOrderFrequency,
        totalCustomers: totalClients,
      },
      financial: {
        // No hay margen bruto sin costo de producto en servicios.
        grossMargin: 0,
        avgTicket,
        totalRevenue,
        totalOrders,
      },
    };
  }

  // Sparklines de 7 días para el dashboard de un freelancer: ingresos de
  // solicitudes cerradas, solicitudes nuevas recibidas, clientes nuevos.
  // No hay stock de productos, así que ese widget queda en null (el
  // frontend ya distingue null de 0 real).
  async getDashboardTrends(
    providerId: string
  ): Promise<AnalyticsDashboardTrends> {
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

    const [closedRequests, newRequests] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: {
          providerId,
          status: CLOSED,
          statusUpdatedAt: { gte: from, lte: endOfDay(today) },
        },
        select: { statusUpdatedAt: true, price: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId, createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true, requesterId: true, clientPhone: true },
      }),
    ]);

    const dayIndex = (date: Date) =>
      Math.floor(
        (startOfDay(new Date(date)).getTime() - from.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    const salesValues = Array(days).fill(0);
    closedRequests.forEach((r) => {
      if (!r.statusUpdatedAt) return;
      const idx = dayIndex(r.statusUpdatedAt);
      if (idx >= 0 && idx < days) salesValues[idx] += Number(r.price ?? 0);
    });

    const requestsValues = Array(days).fill(0);
    newRequests.forEach((r) => {
      const idx = dayIndex(r.createdAt);
      if (idx >= 0 && idx < days) requestsValues[idx]++;
    });

    // Clientes nuevos por día: primera vez que se ve ese requesterId/teléfono
    // dentro de la ventana de 7 días (no histórico completo, es una aproximación
    // razonable para un sparkline corto).
    const seenClients = new Set<string>();
    const newClientsValues = Array(days).fill(0);
    [...newRequests]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .forEach((r) => {
        const key = r.requesterId ?? r.clientPhone;
        if (seenClients.has(key)) return;
        seenClients.add(key);
        const idx = dayIndex(r.createdAt);
        if (idx >= 0 && idx < days) newClientsValues[idx]++;
      });

    return {
      labels,
      salesToday: salesValues.map((v) => Math.round(v * 100) / 100),
      activeOrders: requestsValues,
      newCustomers: newClientsValues,
      lowStock: labels.map(() => null),
    };
  }
}
