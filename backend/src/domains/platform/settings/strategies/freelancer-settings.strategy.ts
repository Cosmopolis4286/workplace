import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  UpdatePaymentSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
} from '../dto/update-settings.dto';
import { SettingsAccountStrategy } from './settings-account.strategy.interface';

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
    return { restaurant: null, settings };
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
}
