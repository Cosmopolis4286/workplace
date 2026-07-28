import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
} from '../dto/update-settings.dto';
import { SettingsAccountStrategy } from './settings-account.strategy.interface';

@Injectable()
export class CommerceSettingsStrategy implements SettingsAccountStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurant(userId: string) {
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

  async getOrCreateSettings(commerceId: string) {
    const existing = await this.prisma.restaurantSettings.findUnique({
      where: { commerceId },
    });
    if (existing) return existing;
    return this.prisma.restaurantSettings.create({ data: { commerceId } });
  }

  async getSettings(userId: string) {
    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    return { restaurant, settings };
  }

  async updatePaymentSettings(userId: string, dto: UpdatePaymentSettingsDto) {
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: dto,
    });
  }

  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews } = dto;
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { notifyNewOrders, notifyLowStock, notifyDailyReports, notifyCustomerReviews },
    });
  }

  async getModuleSettings(userId: string, availableModules: string[]) {
    const restaurant = await this.getRestaurant(userId);
    const settings = await this.getOrCreateSettings(restaurant.id);
    return { availableModules, disabledModules: settings.disabledModules };
  }

  async updateModuleSettings(userId: string, dto: UpdateModuleSettingsDto) {
    const restaurant = await this.getRestaurant(userId);
    await this.getOrCreateSettings(restaurant.id);
    return this.prisma.restaurantSettings.update({
      where: { commerceId: restaurant.id },
      data: { disabledModules: dto.disabledModules },
    });
  }
}
