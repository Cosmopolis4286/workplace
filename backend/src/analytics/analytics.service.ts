import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CommerceAnalyticsStrategy } from './strategies/commerce-analytics.strategy';
import { FreelancerAnalyticsStrategy } from './strategies/freelancer-analytics.strategy';
import { AnalyticsAccountStrategy, AnalyticsOverview } from './strategies/analytics-overview.strategy.interface';

/**
 * Orquestador delgado: delega a CommerceAnalyticsStrategy o
 * FreelancerAnalyticsStrategy según el tipo de cuenta del usuario. Antes de
 * este Strategy pattern, este servicio tenía 949 líneas con dos pipelines de
 * negocio completos y paralelos (getOverview/getFreelancerOverview,
 * getDashboardTrends/getFreelancerDashboardTrends) que podían divergir
 * silenciosamente en la forma de la respuesta.
 *
 * `role`/`accountType` se recibe como parámetro (derivado del JWT en el
 * controller) en vez de resolverse internamente vía AccountTypeResolver,
 * para no agregar una query extra a la DB en cada request de analytics.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly commerceStrategy: CommerceAnalyticsStrategy,
    private readonly freelancerStrategy: FreelancerAnalyticsStrategy
  ) {}

  private resolveStrategy(role: string): AnalyticsAccountStrategy {
    return role === 'FREELANCER' ? this.freelancerStrategy : this.commerceStrategy;
  }

  async getOverview(userId: string, role: string, dto: QueryAnalyticsDto): Promise<AnalyticsOverview> {
    return this.resolveStrategy(role).getOverview(userId, dto);
  }

  async getDashboardTrends(userId: string, role: string) {
    return this.resolveStrategy(role).getDashboardTrends(userId);
  }
}
