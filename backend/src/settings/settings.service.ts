import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateRestaurantInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurant(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });
    if (!restaurant)
      throw new ForbiddenException(
        'El usuario no tiene un restaurante asociado'
      );
    return restaurant;
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
}
