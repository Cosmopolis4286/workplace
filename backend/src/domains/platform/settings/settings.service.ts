import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../money/plans/plan-limits.facade';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { CommerceSettingsStrategy } from './strategies/commerce-settings.strategy';
import { FreelancerSettingsStrategy } from './strategies/freelancer-settings.strategy';
import { SettingsAccountStrategy } from './strategies/settings-account.strategy.interface';
import {
  UpdateCommerceInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
  UpdateBusinessNameDto,
} from './dto/update-settings.dto';

/**
 * Orquestador delgado: delega a CommerceSettingsStrategy o
 * FreelancerSettingsStrategy según el tipo de cuenta del usuario. Antes de
 * este Strategy pattern, este servicio tenía 6 métodos con
 * `if (role === 'FREELANCER')` inline repetido en cada uno.
 *
 * `updateCommerceInfo`/`updateOperationSettings` no forman parte del
 * Strategy: son exclusivos de COMMERCE. La restricción de acceso vive en
 * AccountTypeGuard (@RequireAccountType('COMMERCE') en SettingsController,
 * mismo guard que usa MenuController) — este service ya no necesita
 * validar el tipo de cuenta él mismo.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimitsService: PlanLimitsFacade,
    private readonly accountTypeResolver: AccountTypeResolver,
    private readonly commerceStrategy: CommerceSettingsStrategy,
    private readonly freelancerStrategy: FreelancerSettingsStrategy
  ) {}

  private async resolveStrategy(userId: string): Promise<SettingsAccountStrategy> {
    const accountType = await this.accountTypeResolver.resolve(userId);
    return accountType === 'FREELANCER' ? this.freelancerStrategy : this.commerceStrategy;
  }

  // ─── GET all settings ───────────────────────────────────────────────────────

  async getSettings(userId: string) {
    const strategy = await this.resolveStrategy(userId);
    return strategy.getSettings(userId);
  }

  // ─── Commerce info (solo COMMERCE) ──────────────────────────────────────────

  async updateCommerceInfo(userId: string, dto: UpdateCommerceInfoDto) {
    const commerce = await this.commerceStrategy.getCommerce(userId);
    // socialLinks llega como instancia de SocialLinksDto (class-transformer);
    // Prisma exige un plain object para un campo Json (InputJsonObject), no
    // una clase con tipado nominal — se serializa explícitamente.
    const { socialLinks, ...rest } = dto;
    const updated = await this.prisma.commerce.update({
      where: { id: commerce.id },
      data: {
        ...rest,
        ...(socialLinks !== undefined && { socialLinks: { ...socialLinks } }),
      },
    });
    await this.redis.del(userFindByIdCacheKey(userId));
    return updated;
  }

  // ─── Nombre de negocio/profesional (usado en el onboarding, ambos tipos) ────
  // COMMERCE → Commerce.name (visible en catálogo/perfil público).
  // FREELANCER → FreelancerSettings.professionalName (no tiene Commerce).

  async updateBusinessName(userId: string, dto: UpdateBusinessNameDto) {
    const accountType = await this.accountTypeResolver.resolve(userId);
    if (accountType === 'FREELANCER') {
      return this.freelancerStrategy.updateProfessionalName(userId, dto.name);
    }
    return this.updateCommerceInfo(userId, { name: dto.name });
  }

  // ─── Store slug (/loja/:slug) — solo COMMERCE ───────────────────────────────

  async checkCommerceSlugAvailability(userId: string, slug: string) {
    return this.commerceStrategy.checkSlugAvailability(slug.toLowerCase(), userId);
  }

  async updateCommerceSlug(userId: string, slug: string) {
    return this.commerceStrategy.updateSlug(userId, slug.toLowerCase());
  }

  // ─── Profile slug (/pro/:slug) — solo FREELANCER ────────────────────────────

  async checkFreelancerSlugAvailability(userId: string, slug: string) {
    return this.freelancerStrategy.checkSlugAvailability(slug.toLowerCase(), userId);
  }

  async updateFreelancerSlug(userId: string, slug: string) {
    return this.freelancerStrategy.updateSlug(userId, slug.toLowerCase());
  }

  // ─── Payment settings ───────────────────────────────────────────────────────

  private async assertValidCurrency(currency?: string): Promise<string | undefined> {
    if (!currency) return currency;
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { code: currency.toUpperCase() },
    });
    if (!rate || !rate.isActive) {
      throw new BadRequestException(`La moneda "${currency}" no está disponible`);
    }
    return currency.toUpperCase();
  }

  async updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto) {
    const currency = await this.assertValidCurrency(dto.currency);
    const strategy = await this.resolveStrategy(userId);
    return strategy.updatePaymentSettings(userId, { ...dto, currency });
  }

  // ─── Operation settings (solo COMMERCE: prep/delivery no aplican a servicios) ─

  async updateOperationSettings(
    userId: string,
    dto: UpdateOperationSettingsDto
  ) {
    const commerce = await this.commerceStrategy.getCommerce(userId);
    await this.commerceStrategy.getOrCreateSettings(commerce.id);
    return this.prisma.commerceSettings.update({
      where: { commerceId: commerce.id },
      data: dto,
    });
  }

  // ─── Notification settings ──────────────────────────────────────────────────

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto
  ) {
    const strategy = await this.resolveStrategy(userId);
    return strategy.updateNotificationSettings(userId, dto);
  }

  // ─── Module settings (self-service opt-out) ─────────────────────────────────

  /** Modules the user's plan/category include, plus which of those it has hidden. */
  async getModuleSettings(userId: string) {
    const availableModules = await this.planLimitsService.getSelectableModules(userId);
    const strategy = await this.resolveStrategy(userId);
    return strategy.getModuleSettings(userId, availableModules);
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    // Self-service can only hide modules the plan/category already grant —
    // it can never be used to sneak in access to a module outside the plan.
    const selectable = await this.planLimitsService.getSelectableModules(userId);
    const invalid = dto.disabledModules.filter((m) => !selectable.includes(m));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Los siguientes módulos no pertenecen a tu plan: ${invalid.join(', ')}`
      );
    }

    const strategy = await this.resolveStrategy(userId);
    return strategy.updateModuleSettings(userId, dto);
  }
}
