import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../money/plans/plan-limits.facade';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { CapabilitiesService } from '../../../common/capabilities/capabilities.service';
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
  UpdatePriceGuardSettingsDto,
  UpdateLocationDto,
  UpdateFreelancerProfileDto,
} from './dto/update-settings.dto';

/**
 * Orquestador delgado: delega a CommerceSettingsStrategy o
 * FreelancerSettingsStrategy según si el usuario TIENE Commerce. Antes de
 * este Strategy pattern, este servicio tenía 6 métodos con
 * `if (role === 'FREELANCER')` inline repetido en cada uno.
 *
 * `updateCommerceInfo`/`updateOperationSettings`/`updatePriceGuardSettings`
 * no forman parte del Strategy: operan sobre el Commerce del usuario
 * directo vía `commerceStrategy.getCommerce()`. La restricción de acceso
 * vive en CapabilityGuard (@RequireCapability('HAS_COMMERCE') en
 * SettingsController) — un PROFESSIONAL que vende producto también tiene
 * Commerce ("opción 2"), así que el criterio es "tiene Commerce", no el tipo
 * de cuenta. Este service no valida nada de eso él mismo.
 *
 * resolveStrategy() usaba AccountTypeResolver (COMMERCE/FREELANCER
 * colapsado) hasta que se detectó el mismo hueco que ya se había corregido
 * en menu/orders/customers/delivery: un PROFESSIONAL con Commerce ("opción
 * 2", ej. categoría "Comida") resolvía accountType=FREELANCER (sin perfil
 * BUSINESS) y caía en FreelancerSettingsStrategy — su GET /settings nunca
 * incluía CommerceSettings (operaciones/price guard), aunque esos datos
 * existieran en la DB y updateOperationSettings/updatePriceGuardSettings ya
 * escribieran ahí correctamente. Ahora usa HAS_COMMERCE (CapabilitiesService,
 * mismo criterio que ModuleAccessGuard) — "tiene Commerce" en vez de "accountType".
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(PLAN_LIMITS_FACADE)
    private readonly planLimitsService: PlanLimitsFacade,
    private readonly accountTypeResolver: AccountTypeResolver,
    private readonly capabilities: CapabilitiesService,
    private readonly commerceStrategy: CommerceSettingsStrategy,
    private readonly freelancerStrategy: FreelancerSettingsStrategy
  ) {}

  private async resolveStrategy(
    userId: string
  ): Promise<SettingsAccountStrategy> {
    const hasCommerce = await this.capabilities.has(userId, 'HAS_COMMERCE');
    return hasCommerce ? this.commerceStrategy : this.freelancerStrategy;
  }

  // ─── GET all settings ───────────────────────────────────────────────────────

  // Un PROFESIONAL híbrido ("opción 2": tiene Commerce Y perfil profesional
  // activo, ej. categoría "Comida") gestiona AMBOS desde la misma pantalla
  // de Configuración — vende del catálogo de precio fijo y también cotiza
  // trabajos a medida. resolveStrategy() solo elige una forma para
  // `settings` (CommerceSettings), así que acá se agrega `freelancerSettings`
  // aparte cuando también tiene HAS_PROFESSIONAL_PROFILE, en vez de obligar
  // al frontend a adivinar qué forma tiene `settings` con un solo booleano.
  async getSettings(userId: string) {
    const capabilities = await this.capabilities.resolve(userId);
    const strategy = capabilities.HAS_COMMERCE
      ? this.commerceStrategy
      : this.freelancerStrategy;
    const result = await strategy.getSettings(userId);

    if (capabilities.HAS_COMMERCE && capabilities.HAS_PROFESSIONAL_PROFILE) {
      const { settings: freelancerSettings } =
        await this.freelancerStrategy.getSettings(userId);
      return { ...result, freelancerSettings };
    }

    return result;
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

  // ─── Freelancer profile info (solo FREELANCER) ─────────────────────────────
  // Simétrico a updateCommerceInfo: no forma parte del Strategy compartido
  // porque un COMMERCE puro no tiene FreelancerSettings — la restricción de
  // acceso vive en @RequireCapability('HAS_PROFESSIONAL_PROFILE') en
  // SettingsController, igual criterio que el slug profesional.
  async updateFreelancerProfile(
    userId: string,
    dto: UpdateFreelancerProfileDto
  ) {
    const updated = await this.freelancerStrategy.updateProfileInfo(
      userId,
      dto
    );
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

  // ─── Ubicación base para matching por distancia (ambos tipos) ───────────────

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const strategy = await this.resolveStrategy(userId);
    return strategy.updateLocation(userId, dto);
  }

  // ─── Store slug (/loja/:slug) — solo COMMERCE ───────────────────────────────

  async checkCommerceSlugAvailability(userId: string, slug: string) {
    return this.commerceStrategy.checkSlugAvailability(
      slug.toLowerCase(),
      userId
    );
  }

  async updateCommerceSlug(userId: string, slug: string) {
    return this.commerceStrategy.updateSlug(userId, slug.toLowerCase());
  }

  // ─── Profile slug (/pro/:slug) — solo FREELANCER ────────────────────────────

  async checkFreelancerSlugAvailability(userId: string, slug: string) {
    return this.freelancerStrategy.checkSlugAvailability(
      slug.toLowerCase(),
      userId
    );
  }

  async updateFreelancerSlug(userId: string, slug: string) {
    return this.freelancerStrategy.updateSlug(userId, slug.toLowerCase());
  }

  // ─── Payment settings ───────────────────────────────────────────────────────

  private async assertValidCurrency(
    currency?: string
  ): Promise<string | undefined> {
    if (!currency) return currency;
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { code: currency.toUpperCase() },
    });
    if (!rate || !rate.isActive) {
      throw new BadRequestException(
        `La moneda "${currency}" no está disponible`
      );
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

  // ─── Price Guard settings (solo COMMERCE) ───────────────────────────────────

  async updatePriceGuardSettings(
    userId: string,
    dto: UpdatePriceGuardSettingsDto
  ) {
    const commerce = await this.commerceStrategy.getCommerce(userId);
    await this.commerceStrategy.getOrCreateSettings(commerce.id);
    return this.prisma.commerceSettings.update({
      where: { commerceId: commerce.id },
      data: dto,
    });
  }

  // ─── Notification settings ──────────────────────────────────────────────────

  // Mismo hueco que getSettings(): un PROFESIONAL híbrido resuelve a
  // CommerceSettingsStrategy (hasCommerce), que ignora silenciosamente
  // notifyNewRequests/notifyRequestUpdates (solo existen en
  // FreelancerSettings) — sus notificaciones de solicitudes nunca se
  // guardaban. Cada strategy ya destructura solo los campos que le
  // pertenecen del mismo dto compartido, así que llamar a ambas en paralelo
  // para el híbrido es seguro (no hay escritura cruzada de campos).
  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto
  ) {
    const capabilities = await this.capabilities.resolve(userId);

    if (capabilities.HAS_COMMERCE && capabilities.HAS_PROFESSIONAL_PROFILE) {
      const [updated] = await Promise.all([
        this.commerceStrategy.updateNotificationSettings(userId, dto),
        this.freelancerStrategy.updateNotificationSettings(userId, dto),
      ]);
      return updated;
    }

    const strategy = capabilities.HAS_COMMERCE
      ? this.commerceStrategy
      : this.freelancerStrategy;
    return strategy.updateNotificationSettings(userId, dto);
  }

  // ─── Module settings (self-service opt-out) ─────────────────────────────────

  /** Modules the user's plan/category include, plus which of those it has hidden. */
  async getModuleSettings(userId: string) {
    const availableModules =
      await this.planLimitsService.getSelectableModules(userId);
    const strategy = await this.resolveStrategy(userId);
    return strategy.getModuleSettings(userId, availableModules);
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    // Self-service can only hide modules the plan/category already grant —
    // it can never be used to sneak in access to a module outside the plan.
    const selectable =
      await this.planLimitsService.getSelectableModules(userId);
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
