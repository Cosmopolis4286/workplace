import { QueryAnalyticsDto } from '../dto/query-analytics.dto';

export interface AnalyticsDashboardTrends {
  labels: string[];
  salesToday: number[];
  activeOrders: number[];
  newCustomers: number[];
  lowStock: (number | null)[];
}

interface LabeledSeries {
  labels: string[];
  values: number[];
}

export interface AnalyticsOverview {
  period: string;
  compareWith: string;
  dateRange: { from: string; to: string };
  previousDateRange: { from: string; to: string } | null;
  kpis: {
    totalRevenue: number;
    totalRevenueChange: number | null;
    totalOrders: number;
    totalOrdersChange: number | null;
    avgTicket: number;
    avgTicketChange: number | null;
    newCustomers: number;
    newCustomersChange: number | null;
  };
  revenueTrend: LabeledSeries;
  ordersByHour: LabeledSeries;
  topProducts: LabeledSeries & { revenue: number[] };
  customerSegments: LabeledSeries;
  performance: {
    operational: {
      avgPrepTime: number;
      avgDeliveryTime: number;
      cancellationRate: number;
      cancellations: number;
      totalInPeriod: number;
    };
    growth: {
      newCustomers: number;
      retentionRate: number;
      clv: number;
      orderFrequency: number;
      totalCustomers: number;
    };
    financial: {
      grossMargin: number;
      avgTicket: number;
      totalRevenue: number;
      totalOrders: number;
    };
    /** Solo presente en la vista de plataforma (PlatformAnalyticsStrategy). */
    activeCommerces?: number;
  };
}

/**
 * Contrato único de analytics para ambos tipos de cuenta. Antes de este
 * Strategy, AnalyticsService tenía dos pipelines paralelos completos
 * (getOverview/getFreelancerOverview, getDashboardTrends/
 * getFreelancerDashboardTrends) que podían divergir silenciosamente en la
 * forma de la respuesta — esta interfaz hace esa forma explícita.
 */
export interface AnalyticsAccountStrategy {
  getOverview(
    userId: string,
    dto: QueryAnalyticsDto
  ): Promise<AnalyticsOverview>;
  getDashboardTrends(userId: string): Promise<AnalyticsDashboardTrends>;
}
