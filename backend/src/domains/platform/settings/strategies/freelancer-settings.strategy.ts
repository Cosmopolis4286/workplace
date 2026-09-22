import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
  UpdateLocationDto,
} from '../dto/update-settings.dto';
import { SettingsAccountStrategy } from './settings-account.strategy.interface';
import { COMMERCE_SLUG_COOLDOWN_DAYS, RESERVED_SLUGS } from './commerce-settings.strategy';

@Injectable()
export class FreelancerSettingsStrategy implements SettingsAccountStrategy {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateFreelancerSettings(userId: string) {
    const existing = await this.prisma.freelancerSettings.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.freelancerSettings.create({ data: { userId } });
  }

  async getSettings(userId: string) {
    const settings = await this.getOrCreateFreelancerSettings(userId);
    return { commerce: null, settings };
  }

  async updateProfessionalName(userId: string, name: string) {
    await this.getOrCreateFreelancerSettings(userId);
    return this.prisma.freelancerSettings.update({
      where: { userId },
      data: { professionalName: name },
    });
  }

  async updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto) {
    // tax/suggestedTip/paymentMethods no existen en FreelancerSettings —
    // se ignoran silenciosamente si un freelancer los envía por error.
    await this.getOrCreateFreelancerSettings(userId);
    return this.prisma.freelancerSettings.update({
      where: { userId },
      data: { currency: dto.currency },
    });
  }

  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const { notifyNewRequests, notifyRequestUpdates, notifyDailyReports, notifyCustomerReviews } = dto;
    await this.getOrCreateFreelancerSettings(userId);
    return this.prisma.freelancerSettings.update({
      where: { userId },
      data: { notifyNewRequests, notifyRequestUpdates, notifyDailyReports, notifyCustomerReviews },
    });
  }

  async getModuleSettings(userId: string, availableModules: string[]) {
    const settings = await this.getOrCreateFreelancerSettings(userId);
    return { availableModules, disabledModules: settings.disabledModules };
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    await this.getOrCreateFreelancerSettings(userId);
    return this.prisma.freelancerSettings.update({
      where: { userId },
      data: { disabledModules: dto.disabledModules },
    });
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    await this.getOrCreateFreelancerSettings(userId);
    return this.prisma.freelancerSettings.update({
      where: { userId },
      data: { latitude: dto.latitude, longitude: dto.longitude },
    });
  }

  // ─── Profile slug (/pro/:slug) ──────────────────────────────────────────────
  // Mismo patrón/cooldown que CommerceSettingsStrategy.checkSlugAvailability
  // /updateSlug (/loja/:slug) — namespace @unique distinto (freelancer_settings
  // vs commerces), así que no hay riesgo de colisión entre ambos slugs.

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

    const settings = await this.getOrCreateFreelancerSettings(userId);
    const existing = await this.prisma.freelancerSettings.findUnique({ where: { slug } });
    const available = !existing || existing.userId === userId;

    let canChange = true;
    let daysLeft = 0;
    let nextChangeAt: string | null = null;

    if (settings.slugUpdatedAt && slug !== settings.slug) {
      const daysSince =
        (Date.now() - settings.slugUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < COMMERCE_SLUG_COOLDOWN_DAYS) {
        canChange = false;
        daysLeft = Math.ceil(COMMERCE_SLUG_COOLDOWN_DAYS - daysSince);
        nextChangeAt = new Date(
          settings.slugUpdatedAt.getTime() + COMMERCE_SLUG_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
      }
    }

    return { available, canChange, daysLeft, nextChangeAt };
  }

  async updateSlug(userId: string, slug: string) {
    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException('Esa URL está reservada, elige otra');
    }

    const settings = await this.getOrCreateFreelancerSettings(userId);

    if (slug === settings.slug) return settings;

    if (settings.slugUpdatedAt) {
      const daysSince =
        (Date.now() - settings.slugUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < COMMERCE_SLUG_COOLDOWN_DAYS) {
        const daysLeft = Math.ceil(COMMERCE_SLUG_COOLDOWN_DAYS - daysSince);
        throw new BadRequestException(
          `Debes esperar ${daysLeft} día(s) más para volver a cambiar la URL de tu perfil`
        );
      }
    }

    try {
      return await this.prisma.freelancerSettings.update({
        where: { userId },
        data: { slug, slugUpdatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Esa URL de perfil ya está en uso');
      }
      throw err;
    }
  }
}
