import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CommerceAnalyticsStrategy } from './strategies/commerce-analytics.strategy';
import { FreelancerAnalyticsStrategy } from './strategies/freelancer-analytics.strategy';
import { PlatformAnalyticsStrategy } from './strategies/platform-analytics.strategy';
import { AnalyticsAccountStrategy, AnalyticsOverview } from './strategies/analytics-overview.strategy.interface';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';

/**
 * Orquestador delgado: delega a CommerceAnalyticsStrategy,
 * FreelancerAnalyticsStrategy o PlatformAnalyticsStrategy según quién pide
 * los datos. Antes de este Strategy pattern, este servicio tenía 949 líneas
 * con dos pipelines de negocio completos y paralelos (getOverview/
 * getFreelancerOverview, getDashboardTrends/getFreelancerDashboardTrends)
 * que podían divergir silenciosamente en la forma de la respuesta.
 *
 * SUPERADMIN/ADMIN van a PlatformAnalyticsStrategy: un admin de plataforma
 * no tiene un Commerce propio, así que caer en CommerceAnalyticsStrategy
 * (el branch por-defecto de antes) dejaba todos los KPIs en cero — se
 * resuelve por Role, no por AccountTypeResolver, porque un admin no tiene
 * UserProfile de tipo BUSINESS/PROFESSIONAL que resolver.
 *
 * El tipo de cuenta de negocio (COMMERCE vs FREELANCER) se resuelve vía
 * AccountTypeResolver (UserProfile ACTIVE, con fallback a Role) en vez de
 * leer el `role` crudo del JWT — Role es hoy un espejo derivado de
 * UserProfile (ver RoleResolverService), y un JWT de hasta 15min puede
 * quedar desactualizado tras un cambio de perfil reciente. La query extra
 * por request es el trade-off aceptado a cambio de no depender de ese
 * espejo potencialmente obsoleto.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly commerceStrategy: CommerceAnalyticsStrategy,
    private readonly freelancerStrategy: FreelancerAnalyticsStrategy,
    private readonly platformStrategy: PlatformAnalyticsStrategy,
    private readonly accountTypeResolver: AccountTypeResolver,
  ) {}

  private async resolveStrategy(userId: string, role: Role): Promise<AnalyticsAccountStrategy> {
    if (role === Role.SUPERADMIN || role === Role.ADMIN) {
      return this.platformStrategy;
    }
    const accountType = await this.accountTypeResolver.resolve(userId);
    return accountType === 'FREELANCER' ? this.freelancerStrategy : this.commerceStrategy;
  }

  async getOverview(userId: string, role: Role, dto: QueryAnalyticsDto): Promise<AnalyticsOverview> {
    return (await this.resolveStrategy(userId, role)).getOverview(userId, dto);
  }

  async getDashboardTrends(userId: string, role: Role) {
    return (await this.resolveStrategy(userId, role)).getDashboardTrends(userId);
  }
}
