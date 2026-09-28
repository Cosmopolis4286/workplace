import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RedisService } from '../../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../../common/utils/cache-keys.util';
import { NO_COMMERCE_MESSAGE } from '../../../../common/commerce-resolver/commerce-resolver.service';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
  UpdateLocationDto,
} from '../dto/update-settings.dto';
import { SettingsAccountStrategy } from './settings-account.strategy.interface';

// Días de espera obligatorios entre dos cambios de slug — misma política que
// USERNAME_COOLDOWN_DAYS (users.service.ts) para no romper enlaces
// compartidos externamente (WhatsApp, redes) con cambios frecuentes de URL.
export const COMMERCE_SLUG_COOLDOWN_DAYS = 30;

// El slug es más público que un username (se comparte como URL de tienda),
// así que a diferencia de username sí bloqueamos rutas reservadas de la app.
// Exportado: reusado también por FreelancerSettingsStrategy (/pro/:slug) —
// mismo namespace de rutas reservadas de la app para ambos tipos de slug.
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'login', 'register', 'settings', 'p',
  'loja', 'catalog', 'catalogo', 'search', 'buscar', 'profile', 'perfil',
  'wallet', 'checkout', 'orders', 'pedidos', 'services', 'servicios',
  'jobs', 'empleos', 'about', 'help', 'ayuda', 'terms', 'privacy',
]);

@Injectable()
export class CommerceSettingsStrategy implements SettingsAccountStrategy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  // Ya no auto-crea: antes cualquier cuenta sin Commerce que tocara settings
  // (incluido un SUPERADMIN abriendo Configuración) terminaba con un Commerce
  // fantasma. El Commerce se crea solo al aprobar el perfil
  // (CommerceResolverService.provision / shouldProvisionCommerce).
  async getCommerce(userId: string) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
    });
    if (!commerce) throw new ForbiddenException(NO_COMMERCE_MESSAGE);
    return commerce;
  }

  async getOrCreateSettings(commerceId: string) {
    const existing = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
    });
    if (existing) return existing;
    return this.prisma.commerceSettings.create({ data: { commerceId } });
  }

  // Lectura null-safe: una cuenta sin Commerce (ej. ADMIN, que tiene
  // settings:view) recibe { commerce: null, settings: null } en vez de un 403
  // o de que se le cree uno.
  async getSettings(userId: string) {
    const commerce = await this.prisma.commerce.findUnique({ where: { userId } });
    if (!commerce) return { commerce: null, settings: null };
    const settings = await this.getOrCreateSettings(commerce.id);
    return { commerce, settings };
  }

  async updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto) {
    const commerce = await this.getCommerce(userId);
    await this.getOrCreateSettings(commerce.id);
    return this.prisma.commerceSettings.update({
      where: { commerceId: commerce.id },
      data: dto,
    });
  }

  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews } = dto;
    const commerce = await this.getCommerce(userId);
    await this.getOrCreateSettings(commerce.id);
    return this.prisma.commerceSettings.update({
      where: { commerceId: commerce.id },
      data: { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews },
    });
  }

  async getModuleSettings(userId: string, availableModules: string[]) {
    const commerce = await this.getCommerce(userId);
    const settings = await this.getOrCreateSettings(commerce.id);
    return { availableModules, disabledModules: settings.disabledModules };
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    const commerce = await this.getCommerce(userId);
    await this.getOrCreateSettings(commerce.id);
    return this.prisma.commerceSettings.update({
      where: { commerceId: commerce.id },
      data: { disabledModules: dto.disabledModules },
    });
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const commerce = await this.getCommerce(userId);
    return this.prisma.commerce.update({
      where: { id: commerce.id },
      data: { latitude: dto.latitude, longitude: dto.longitude },
    });
  }

  async checkSlugAvailability(
    slug: string,
    userId: string
  ): Promise<{
    available: boolean;
    canChange: boolean;
    daysLeft: number;
    nextChangeAt: string | null;
  }> {
    if (RESERVED_SLUGS.has(slug)) {
      return { available: false, canChange: true, daysLeft: 0, nextChangeAt: null };
    }

    const commerce = await this.getCommerce(userId);
    const existing = await this.prisma.commerce.findUnique({ where: { slug } });
    const available = !existing || existing.id === commerce.id;

    let canChange = true;
    let daysLeft = 0;
    let nextChangeAt: string | null = null;

    if (commerce.slugUpdatedAt && slug !== commerce.slug) {
      const daysSince =
        (Date.now() - commerce.slugUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < COMMERCE_SLUG_COOLDOWN_DAYS) {
        canChange = false;
        daysLeft = Math.ceil(COMMERCE_SLUG_COOLDOWN_DAYS - daysSince);
        nextChangeAt = new Date(
          commerce.slugUpdatedAt.getTime() + COMMERCE_SLUG_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
      }
    }

    return { available, canChange, daysLeft, nextChangeAt };
  }

  async updateSlug(userId: string, slug: string) {
    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException('Esa URL está reservada, elige otra');
    }

    const commerce = await this.getCommerce(userId);

    if (slug === commerce.slug) return commerce;

    if (commerce.slugUpdatedAt) {
      const daysSince =
        (Date.now() - commerce.slugUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < COMMERCE_SLUG_COOLDOWN_DAYS) {
        const daysLeft = Math.ceil(COMMERCE_SLUG_COOLDOWN_DAYS - daysSince);
        throw new BadRequestException(
          `Debes esperar ${daysLeft} día(s) más para volver a cambiar la URL de tu tienda`
        );
      }
    }

    try {
      const updated = await this.prisma.commerce.update({
        where: { id: commerce.id },
        data: { slug, slugUpdatedAt: new Date() },
      });
      await this.redis.del(userFindByIdCacheKey(userId));
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Esa URL de tienda ya está en uso');
      }
      throw err;
    }
  }
}
