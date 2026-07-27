import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CustomerSegment, ServiceRequestStatus } from '@prisma/client';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return startOfDay(new Date(d.setDate(diff)));
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return startOfDay(new Date(d.getFullYear(), q * 3, 1));
}

function getPeriodRange(
  period: string,
  dateFrom?: string,
  dateTo?: string
): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(new Date());

  switch (period) {
    case 'today':
      // from = start of today, to = now
      return { from, to };
    case 'week':
      return { from: startOfWeek(new Date()), to };
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case 'quarter':
      return { from: startOfQuarter(new Date()), to };
    case '90d':
      from.setDate(from.getDate() - 89);
      break;
    case '1y':
      from.setFullYear(from.getFullYear() - 1);
      from.setDate(from.getDate() + 1);
      break;
    case 'custom':
      if (!dateFrom || !dateTo)
        throw new BadRequestException(
          'dateFrom and dateTo are required for custom period'
        );
      return {
        from: startOfDay(new Date(dateFrom)),
        to: endOfDay(new Date(dateTo)),
      };
    case '30d':
    default:
      from.setDate(from.getDate() - 29);
  }

  return { from, to };
}

function getPreviousPeriodRange(
  period: string,
  compareWith: string,
  current: { from: Date; to: Date }
): { from: Date; to: Date } | null {
  if (compareWith === 'none') return null;

  const duration = current.to.getTime() - current.from.getTime();

  if (compareWith === 'year') {
    return {
      from: new Date(current.from.getTime() - 365 * 24 * 60 * 60 * 1000),
      to: new Date(current.to.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
  }

  // previous period
  return {
    from: new Date(current.from.getTime() - duration - 1),
    to: new Date(current.from.getTime() - 1),
  };
}

function pct(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Si no tiene restaurante, usar el userId como commerceId
    return restaurant?.id ?? userId;
  }

  // ─── Main analytics endpoint ──────────────────────────────────────────────

  async getOverview(userId: string, role: string, dto: QueryAnalyticsDto) {
    const { period = '30d', compareWith = 'previous', dateFrom, dateTo } = dto;
    const current = getPeriodRange(period, dateFrom, dateTo);
    const previous = getPreviousPeriodRange(period, compareWith, current);

    if (role === 'FREELANCER') {
      return this.getFreelancerOverview(userId, period, compareWith, current, previous);
    }

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

  // ═══════════════════════════════════════════════════════════════════════
  // ─── Freelancer overview (Service / ServiceRequest / ServiceEvent) ───────
  // Un freelancer no tiene Product/Order/Appointment/Customer — su unidad de
  // negocio es el Service y su "venta" es el ServiceRequest. Se reusa el
  // mismo contrato de respuesta que el comercio para no romper el frontend,
  // mapeando conceptualmente: pedido → solicitud, producto → servicio.
  // ═══════════════════════════════════════════════════════════════════════

  private async getFreelancerOverview(
    providerId: string,
    period: string,
    compareWith: string,
    current: { from: Date; to: Date },
    previous: { from: Date; to: Date } | null
  ) {
    const [
      kpis,
      prevKpis,
      revenueTrend,
      requestsByHour,
      topServices,
      performance,
    ] = await Promise.all([
      this.getFreelancerKpis(providerId, current.from, current.to),
      previous ? this.getFreelancerKpis(providerId, previous.from, previous.to) : null,
      this.getFreelancerRevenueTrend(providerId, current.from, current.to, period),
      this.getFreelancerRequestsByHour(providerId, current.from, current.to),
      this.getFreelancerTopServices(providerId, current.from, current.to),
      this.getFreelancerPerformanceMetrics(providerId, current.from, current.to),
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
        totalRevenueChange: pct(kpis.totalRevenue, prevKpis?.totalRevenue ?? null),
        totalOrders: kpis.totalRequests,
        totalOrdersChange: pct(kpis.totalRequests, prevKpis?.totalRequests ?? null),
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

  private static readonly CLOSED = ServiceRequestStatus.CERRADO;
  private static readonly OPEN_OR_CLOSED_NOT_CANCELLED: ServiceRequestStatus[] = [
    ServiceRequestStatus.PENDIENTE,
    ServiceRequestStatus.VISTO,
    ServiceRequestStatus.CONTACTADO,
    ServiceRequestStatus.CERRADO,
  ];

  private async getFreelancerKpis(providerId: string, from: Date, to: Date) {
    const [closedInPeriod, totalRequests, requesterIds] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: {
          providerId,
          status: AnalyticsService.CLOSED,
          statusUpdatedAt: { gte: from, lte: to },
        },
        select: { price: true },
      }),
      this.prisma.serviceRequest.count({
        where: {
          providerId,
          createdAt: { gte: from, lte: to },
          status: { in: AnalyticsService.OPEN_OR_CLOSED_NOT_CANCELLED },
        },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId, createdAt: { gte: from, lte: to } },
        select: { requesterId: true, clientPhone: true },
      }),
    ]);

    const totalRevenue = closedInPeriod.reduce((sum, r) => sum + (r.price ?? 0), 0);
    const avgTicket = closedInPeriod.length > 0
      ? Math.round((totalRevenue / closedInPeriod.length) * 100) / 100
      : 0;
    // Clientes nuevos: identificados por usuario si autenticó, o por teléfono si fue anónimo.
    // (no se usa `distinct` de Prisma porque trata todos los requesterId=null
    // como un solo grupo, subcontando clientes anónimos distintos)
    const newClients = new Set(requesterIds.map((r) => r.requesterId ?? r.clientPhone)).size;

    return { totalRevenue, totalRequests, avgTicket, newClients };
  }

  private async getFreelancerRevenueTrend(providerId: string, from: Date, to: Date, period: string) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: { providerId, status: AnalyticsService.CLOSED, statusUpdatedAt: { gte: from, lte: to } },
      select: { price: true, statusUpdatedAt: true },
    });

    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const labels: string[] = [];
    const values: number[] = [];

    const fmt =
      period === '1y'
        ? (d: Date) => d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
        : period === 'today'
          ? (d: Date) => `${d.getHours()}:00`
          : (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

    if (period === 'today') {
      const hourly: number[] = Array(24).fill(0);
      closed.forEach((r) => {
        if (!r.statusUpdatedAt) return;
        hourly[new Date(r.statusUpdatedAt).getHours()] += r.price ?? 0;
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
        if (key in monthly) monthly[key] += r.price ?? 0;
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
        const idx = Math.floor((startOfDay(d).getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
        if (idx >= 0 && idx < values.length) values[idx] += r.price ?? 0;
      });
      values.forEach((_, i) => { values[i] = Math.round(values[i] * 100) / 100; });
    }

    return { labels, values };
  }

  private async getFreelancerRequestsByHour(providerId: string, from: Date, to: Date) {
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

  private async getFreelancerTopServices(providerId: string, from: Date, to: Date) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: { providerId, status: AnalyticsService.CLOSED, statusUpdatedAt: { gte: from, lte: to } },
      select: { serviceName: true, price: true },
    });

    const byService = new Map<string, { count: number; revenue: number }>();
    for (const r of closed) {
      const cur = byService.get(r.serviceName) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += r.price ?? 0;
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

  private async getFreelancerPerformanceMetrics(providerId: string, from: Date, to: Date) {
    const [statusCounts, allRequests, avgResponseData] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        where: { providerId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId },
        select: { requesterId: true, clientPhone: true, status: true, price: true },
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
    const cancelled = statusCounts.find((s) => s.status === 'CANCELADO')?._count.id ?? 0;
    const cancellationRate = totalInPeriod > 0 ? Math.round((cancelled / totalInPeriod) * 1000) / 10 : 0;

    const avgResponseHours = avgResponseData.length > 0
      ? avgResponseData.reduce((sum, r) => {
          const hours = (new Date(r.statusUpdatedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
          return sum + Math.max(0, hours);
        }, 0) / avgResponseData.length
      : 0;

    // Identificador de cliente único: usuario autenticado o teléfono si fue anónimo.
    const clientKey = (r: { requesterId: string | null; clientPhone: string }) => r.requesterId ?? r.clientPhone;
    const totalClients = new Set(allRequests.map(clientKey)).size;
    const closedRequests = allRequests.filter((r) => r.status === AnalyticsService.CLOSED);
    const totalRevenue = closedRequests.reduce((sum, r) => sum + (r.price ?? 0), 0);
    const totalOrders = closedRequests.length;
    const avgTicket = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    const requestsByClient = new Map<string, number>();
    for (const r of allRequests) {
      const key = clientKey(r);
      requestsByClient.set(key, (requestsByClient.get(key) ?? 0) + 1);
    }
    const returningClients = Array.from(requestsByClient.values()).filter((c) => c > 1).length;
    const retentionRate = totalClients > 0 ? Math.round((returningClients / totalClients) * 1000) / 10 : 0;
    const avgOrderFrequency = totalClients > 0 ? Math.round((allRequests.length / totalClients) * 10) / 10 : 0;

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
        clv: totalClients > 0 ? Math.round((totalRevenue / totalClients) * 100) / 100 : 0,
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

  // ─── KPIs ────────────────────────────────────────────────────────────────

  private async getKpis(commerceId: string, from: Date, to: Date) {
    // Revenue and orders from appointments (completed ones represent served customers)
    const [completedAppointments, totalOrders, newCustomers, customers] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: {
            commerceId,
            status: 'COMPLETADA',
            date: { gte: from, lte: to },
          },
          select: { id: true },
        }),
        this.prisma.appointment.count({
          where: {
            commerceId,
            date: { gte: from, lte: to },
            status: { notIn: ['CANCELADA', 'NO_SHOW'] },
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
        status: { notIn: ['CANCELADA', 'NO_SHOW'] },
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
      where: { commerceId, status: { not: 'NO_DISPONIBLE' } },
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
      NUEVO: 'Nuevos',
    };

    const allSegments: CustomerSegment[] = [
      'VIP',
      'PREMIUM',
      'REGULAR',
      'NUEVO',
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

  async getDashboardTrends(userId: string, role: string) {
    if (role === 'FREELANCER') return this.getFreelancerDashboardTrends(userId);

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

  // Sparklines de 7 días para el dashboard de un freelancer: ingresos de
  // solicitudes cerradas, solicitudes nuevas recibidas, clientes nuevos.
  // No hay stock de productos, así que ese widget queda en null (el
  // frontend ya distingue null de 0 real).
  private async getFreelancerDashboardTrends(providerId: string) {
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

    const [closedRequests, newRequests] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: { providerId, status: AnalyticsService.CLOSED, statusUpdatedAt: { gte: from, lte: endOfDay(today) } },
        select: { statusUpdatedAt: true, price: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { providerId, createdAt: { gte: from, lte: endOfDay(today) } },
        select: { createdAt: true, requesterId: true, clientPhone: true },
      }),
    ]);

    const dayIndex = (date: Date) =>
      Math.floor((startOfDay(new Date(date)).getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    const salesValues = Array(days).fill(0);
    closedRequests.forEach((r) => {
      if (!r.statusUpdatedAt) return;
      const idx = dayIndex(r.statusUpdatedAt);
      if (idx >= 0 && idx < days) salesValues[idx] += r.price ?? 0;
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
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
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

  // ─── Performance metrics ─────────────────────────────────────────────────

  private async getPerformanceMetrics(
    commerceId: string,
    from: Date,
    to: Date
  ) {
    const [settings, customers, appointments] = await Promise.all([
      this.prisma.restaurantSettings.findUnique({ where: { commerceId } }),
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
      appointments.find((a) => a.status === 'CANCELADA')?._count.id ?? 0;
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
