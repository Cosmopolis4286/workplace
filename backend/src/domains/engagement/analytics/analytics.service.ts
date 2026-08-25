import { Injectable } from '@nestjs/common';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CommerceAnalyticsStrategy } from './strategies/commerce-analytics.strategy';
import { FreelancerAnalyticsStrategy } from './strategies/freelancer-analytics.strategy';
import { AnalyticsAccountStrategy, AnalyticsOverview } from './strategies/analytics-overview.strategy.interface';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';

/**
 * Orquestador delgado: delega a CommerceAnalyticsStrategy o
 * FreelancerAnalyticsStrategy según el tipo de cuenta del usuario. Antes de
 * este Strategy pattern, este servicio tenía 949 líneas con dos pipelines de
 * negocio completos y paralelos (getOverview/getFreelancerOverview,
 * getDashboardTrends/getFreelancerDashboardTrends) que podían divergir
 * silenciosamente en la forma de la respuesta.
 *
 * El tipo de cuenta se resuelve vía AccountTypeResolver (UserProfile ACTIVE,
 * con fallback a Role) en vez de leer el `role` crudo del JWT — Role es hoy
 * un espejo derivado de UserProfile (ver RoleResolverService), y un JWT de
 * hasta 15min puede quedar desactualizado tras un cambio de perfil reciente.
 * La query extra por request es el trade-off aceptado a cambio de no
 * depender de ese espejo potencialmente obsoleto.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly commerceStrategy: CommerceAnalyticsStrategy,
    private readonly freelancerStrategy: FreelancerAnalyticsStrategy,
    private readonly accountTypeResolver: AccountTypeResolver,
  ) {}

  private async resolveStrategy(userId: string): Promise<AnalyticsAccountStrategy> {
    const accountType = await this.accountTypeResolver.resolve(userId);
    return accountType === 'FREELANCER' ? this.freelancerStrategy : this.commerceStrategy;
  }

  async getOverview(userId: string, dto: QueryAnalyticsDto): Promise<AnalyticsOverview> {
    return (await this.resolveStrategy(userId)).getOverview(userId, dto);
  }

  async getDashboardTrends(userId: string) {
    return (await this.resolveStrategy(userId)).getDashboardTrends(userId);
  }
}
