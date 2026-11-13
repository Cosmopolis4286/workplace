import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ReputationFacade,
  REPUTATION_FACADE,
} from '../../reputation/reputation.facade';
import {
  CONTACT_INFO_NOT_ALLOWED_MESSAGE,
  detectContactInfo,
} from '../../../common/utils/contact-redaction.util';
import { RateDeliveryDto } from './dto/rate-delivery.dto';

/**
 * Lo que el cliente hace con su entrega después de recibirla: calificar al
 * repartidor (una vez, solo si la entrega quedó DELIVERED). Driver.rating es
 * el promedio de estas calificaciones.
 */
@Injectable()
export class DeliveryFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REPUTATION_FACADE) private readonly reputation: ReputationFacade
  ) {}

  async getMyRating(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        customerUserId: true,
        status: true,
        driverId: true,
        rating: { select: { stars: true, comment: true } },
      },
    });
    if (!delivery || delivery.customerUserId !== userId) return null;
    return {
      rating: delivery.rating,
      canRate:
        !delivery.rating &&
        !!delivery.driverId &&
        delivery.status === DeliveryStatus.DELIVERED,
    };
  }

  async rate(deliveryId: string, userId: string, dto: RateDeliveryDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { customerUserId: true, status: true, driverId: true },
    });
    // Solo el cliente de la entrega; a cualquier otro, como si no existiera.
    if (!delivery || delivery.customerUserId !== userId) {
      throw new NotFoundException('Entrega no encontrada');
    }
    if (delivery.status !== DeliveryStatus.DELIVERED || !delivery.driverId) {
      throw new BadRequestException(
        'Solo puedes calificar una entrega que ya recibiste'
      );
    }
    const comment = dto.comment?.trim() || null;
    if (comment && detectContactInfo(comment).length) {
      throw new BadRequestException(CONTACT_INFO_NOT_ALLOWED_MESSAGE);
    }

    let rating;
    try {
      rating = await this.prisma.deliveryRating.create({
        data: {
          deliveryId,
          driverId: delivery.driverId,
          customerUserId: userId,
          stars: dto.stars,
          comment,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Ya calificaste esta entrega');
      }
      throw err;
    }

    const avg = await this.prisma.deliveryRating.aggregate({
      where: { driverId: delivery.driverId },
      _avg: { stars: true },
    });
    await this.prisma.driver.update({
      where: { id: delivery.driverId },
      data: { rating: Math.round((avg._avg.stars ?? dto.stars) * 10) / 10 },
    });
    this.reputation.recalculate('DRIVER', delivery.driverId).catch(() => {});
    return rating;
  }
}
