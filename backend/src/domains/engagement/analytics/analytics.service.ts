import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { CommerceAnalyticsStrategy } from './strategies/commerce-analytics.strategy';
import { FreelancerAnalyticsStrategy } from './strategies/freelancer-analytics.strategy';
import { PlatformAnalyticsStrategy } from './strategies/platform-analytics.strategy';
import { AnalyticsAccountStrategy, AnalyticsOverview } from './strategies/analytics-overview.strategy.interface';
import { CapabilitiesService } from '../../../common/capabilities/capabilities.service';

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
 * Para el resto, la estrategia la decide un HECHO de los datos — ¿tiene
 * Commerce? (HAS_COMMERCE) — y no el tipo de cuenta colapsado: con la
 * "opción 2" (2026-09-28) un PROFESSIONAL que vende producto tiene Commerce
 * y sus métricas reales son Order/Product, no ServiceRequest. Antes
 * (accountType === 'FREELANCER') ese caso recibía analytics de servicios y
 * nunca veía sus pedidos. Se lee de la DB en cada request (no del `role`
 * del JWT, que puede quedar desactualizado hasta 15min).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly commerceStrategy: CommerceAnalyticsStrategy,
    private readonly freelancerStrategy: FreelancerAnalyticsStrategy,
    private readonly platformStrategy: PlatformAnalyticsStrategy,
    private readonly capabilities: CapabilitiesService,
  ) {}

  private async resolveStrategy(userId: string, role: Role): Promise<AnalyticsAccountStrategy> {
    if (role === Role.SUPERADMIN || role === Role.ADMIN) {
      return this.platformStrategy;
    }
    return (await this.capabilities.has(userId, 'HAS_COMMERCE')) ? this.commerceStrategy : this.freelancerStrategy;
  }

  async getOverview(userId: string, role: Role, dto: QueryAnalyticsDto): Promise<AnalyticsOverview> {
    return (await this.resolveStrategy(userId, role)).getOverview(userId, dto);
  }

  async getDashboardTrends(userId: string, role: Role) {
    return (await this.resolveStrategy(userId, role)).getDashboardTrends(userId);
  }
}
