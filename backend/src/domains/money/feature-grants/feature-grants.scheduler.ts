import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeatureGrantStatus } from '@prisma/client';

@Injectable()
export class FeatureGrantsScheduler {
  private readonly logger = new Logger(FeatureGrantsScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Corre diariamente — expira grants ACTIVE cuya expiresAt ya pasó, mismo
   * patrón que SubscriptionsScheduler. hasFeature()/consumeUsage() ya
   * evalúan expiración al vuelo, así que esto es solo higiene de datos (el
   * status guardado no queda desactualizado indefinidamente si nadie
   * consulta esa feature en particular).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireGrants() {
    const now = new Date();

    const expired = await this.prisma.featureGrant.updateMany({
      where: {
        status: FeatureGrantStatus.ACTIVE,
        expiresAt: { not: null, lt: now },
      },
      data: { status: FeatureGrantStatus.EXPIRED },
    });

    if (expired.count > 0) {
      this.logger.log(`Expiradas ${expired.count} activación(es) de feature`);
    }
  }
}
