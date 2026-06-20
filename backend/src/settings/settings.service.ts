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

  // ─── GET all settings ───────────────────────────────────────────────────────

  async getSettings(userId: string) {
    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    return { restaurant, settings };
  }

  // ─── Restaurant info ────────────────────────────────────────────────────────

  async updateRestaurantInfo(userId: string, dto: UpdateRestaurantInfoDto) {
    const restaurant = await this.getRestaurant(userId);
    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: dto,
    });
  }

  // ─── Payment settings ───────────────────────────────────────────────────────

  async updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto) {
    if (dto.currency) {
      const rate = await this.prisma.exchangeRate.findUnique({
        where: { code: dto.currency.toUpperCase() },
      });
      if (!rate || !rate.isActive) {
        throw new BadRequestException(
          `La moneda "${dto.currency}" no está disponible`
        );
      }
      dto.currency = dto.currency.toUpperCase();
    }
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: dto,
    });
  }

  // ─── Operation settings ─────────────────────────────────────────────────────

  async updateOperationSettings(
    userId: string,
    dto: UpdateOperationSettingsDto
  ) {
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
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: dto,
    });
  }

  // ─── Module settings (self-service opt-out) ─────────────────────────────────

  /** Modules the commerce's plan/category include, plus which of those it has hidden. */
  async getModuleSettings(userId: string) {
    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    const availableModules = await this.planLimitsService.getSelectableModules(userId);
    return { availableModules, disabledModules: settings.disabledModules };
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);

    // Self-service can only hide modules the plan/category already grant —
    // it can never be used to sneak in access to a module outside the plan.
    const selectable = await this.planLimitsService.getSelectableModules(userId);
    const invalid = dto.disabledModules.filter((m) => !selectable.includes(m));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Los siguientes módulos no pertenecen a tu plan: ${invalid.join(', ')}`
      );
    }

    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { disabledModules: dto.disabledModules },
    });
  }
}
