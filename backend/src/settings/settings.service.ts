import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryHelper } from '../common/helpers/category.helper';
import {
  UpdateRestaurantInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryHelper: CategoryHelper
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurant(userId: string) {
    const restaurantId = await this.categoryHelper.validateRestaurantForFoodCategory(userId);
    if (!restaurantId) {
      // Usuario no es de categoría "Comida", no necesita configuración de restaurante
      throw new ForbiddenException(
        'La configuración de restaurante solo está disponible para usuarios de la categoría "Comida"'
      );
    }
    
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }
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
}
