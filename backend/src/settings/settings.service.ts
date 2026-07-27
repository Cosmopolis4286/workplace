import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import {
  UpdateRestaurantInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitsService: PlanLimitsService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getUserRole(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? 'NORMAL';
  }

  private async getRestaurant(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });
    if (restaurant) return restaurant;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return this.prisma.restaurant.create({
      data: { userId, name: `${user?.firstName ?? 'Mi'} ${user?.lastName ?? 'Negocio'}`.trim() },
    });
  }

  private async getOrCreateSettings(commerceId: string) {
    const existing = await this.prisma.restaurantSettings.findUnique({
      where: { commerceId },
    });
    if (existing) return existing;
    return this.prisma.restaurantSettings.create({ data: { commerceId } });
  }

  private async getOrCreateFreelancerSettings(userId: string) {
    const existing = await this.prisma.freelancerSettings.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.freelancerSettings.create({ data: { userId } });
  }

  // ─── GET all settings ───────────────────────────────────────────────────────

  async getSettings(userId: string) {
    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      const settings = await this.getOrCreateFreelancerSettings(userId);
      return { restaurant: null, settings };
    }
    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    return { restaurant, settings };
  }

  // ─── Restaurant info (solo COMMERCE) ────────────────────────────────────────

  async updateRestaurantInfo(userId: string, dto: UpdateRestaurantInfoDto) {
    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      throw new BadRequestException('Los proveedores de servicios no tienen información de comercio');
    }
    const restaurant = await this.getRestaurant(userId);
    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: dto,
    });
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

    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      // tax/suggestedTip/paymentMethods no existen en FreelancerSettings —
      // se ignoran silenciosamente si un freelancer los envía por error.
      await this.getOrCreateFreelancerSettings(userId);
      return this.prisma.freelancerSettings.update({
        where: { userId },
        data: { currency },
      });
    }

    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { ...dto, currency },
    });
  }

  // ─── Operation settings (solo COMMERCE: prep/delivery no aplican a servicios) ─

  async updateOperationSettings(
    userId: string,
    dto: UpdateOperationSettingsDto
  ) {
    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      throw new BadRequestException('Esta configuración no aplica a proveedores de servicios');
    }
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: dto,
    });
  }

  // ─── Notification settings ──────────────────────────────────────────────────

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto
  ) {
    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      const { notifyNewRequests, notifyRequestUpdates, notifyDailyReports, notifyCustomerReviews } = dto;
      await this.getOrCreateFreelancerSettings(userId);
      return this.prisma.freelancerSettings.update({
        where: { userId },
        data: { notifyNewRequests, notifyRequestUpdates, notifyDailyReports, notifyCustomerReviews },
      });
    }

    const { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews } = dto;
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews },
    });
  }

  // ─── Module settings (self-service opt-out) ─────────────────────────────────

  /** Modules the user's plan/category include, plus which of those it has hidden. */
  async getModuleSettings(userId: string) {
    const availableModules = await this.planLimitsService.getSelectableModules(userId);

    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      const settings = await this.getOrCreateFreelancerSettings(userId);
      return { availableModules, disabledModules: settings.disabledModules };
    }

    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    return { availableModules, disabledModules: settings.disabledModules };
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

    if ((await this.getUserRole(userId)) === 'FREELANCER') {
      await this.getOrCreateFreelancerSettings(userId);
      return this.prisma.freelancerSettings.update({
        where: { userId },
        data: { disabledModules: dto.disabledModules },
      });
    }

    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { disabledModules: dto.disabledModules },
    });
  }
}
