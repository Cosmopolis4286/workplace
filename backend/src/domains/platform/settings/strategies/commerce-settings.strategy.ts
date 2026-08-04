import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RedisService } from '../../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../../common/utils/cache-keys.util';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
} from '../dto/update-settings.dto';
import { SettingsAccountStrategy } from './settings-account.strategy.interface';

@Injectable()
export class CommerceSettingsStrategy implements SettingsAccountStrategy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async getCommerce(userId: string) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
    });
    if (commerce) return commerce;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const created = await this.prisma.commerce.create({
      data: { userId, name: `${user?.firstName ?? 'Mi'} ${user?.lastName ?? 'Negocio'}`.trim() },
    });
    // findById cachea `commerce` (Commerce) — sin esto un findById previo a
    // la creación del commerce (commerce: null) queda stale hasta el TTL.
    await this.redis.del(userFindByIdCacheKey(userId));
    return created;
  }

  async getOrCreateSettings(commerceId: string) {
    const existing = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
    });
    if (existing) return existing;
    return this.prisma.commerceSettings.create({ data: { commerceId } });
  }

  async getSettings(userId: string) {
    const commerce = await this.getCommerce(userId);
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
}
