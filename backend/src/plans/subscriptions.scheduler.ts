import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every day at 01:00 AM.
   * Marks ACTIVE/TRIAL subscriptions as EXPIRED when their endAt has passed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireSubscriptions() {
    const now = new Date()

    const expired = await this.prisma.subscription.updateMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        endAt: { not: null, lt: now },
      },
      data: { status: 'EXPIRED' },
    })

    if (expired.count > 0) {
      this.logger.log(`Expiradas ${expired.count} suscripción(es)`)
    }
  }
}
