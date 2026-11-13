import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeliveryFeedbackService } from '../../domains/operations/delivery/delivery-feedback.service';

describe('DeliveryFeedbackService', () => {
  let prisma: any;
  let reputation: any;
  let service: DeliveryFeedbackService;

  beforeEach(() => {
    prisma = {
      delivery: {
        findUnique: jest.fn().mockResolvedValue({
          customerUserId: 'cliente',
          status: 'DELIVERED',
          driverId: 'driver-1',
          rating: null,
        }),
      },
      deliveryRating: {
        create: jest.fn(({ data }: any) =>
          Promise.resolve({ id: 'r1', ...data })
        ),
        aggregate: jest.fn().mockResolvedValue({ _avg: { stars: 4.25 } }),
      },
      driver: { update: jest.fn() },
    };
    reputation = { recalculate: jest.fn().mockResolvedValue(undefined) };
    service = new DeliveryFeedbackService(prisma, reputation);
  });

  it('el cliente califica al repartidor y actualiza su promedio', async () => {
    await service.rate('d1', 'cliente', { stars: 5, comment: 'Muy amable' });
    expect(prisma.deliveryRating.create).toHaveBeenCalledWith({
      data: {
        deliveryId: 'd1',
        driverId: 'driver-1',
        customerUserId: 'cliente',
        stars: 5,
        comment: 'Muy amable',
      },
    });
    expect(prisma.driver.update).toHaveBeenCalledWith({
      where: { id: 'driver-1' },
      data: { rating: 4.3 },
    });
    expect(reputation.recalculate).toHaveBeenCalledWith('DRIVER', 'driver-1');
  });

  it('solo el cliente de la entrega', async () => {
    await expect(
      service.rate('d1', 'otro', { stars: 1 })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('solo después de recibir', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      customerUserId: 'cliente',
      status: 'IN_TRANSIT',
      driverId: 'driver-1',
    });
    await expect(
      service.rate('d1', 'cliente', { stars: 4 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no acepta datos de contacto en el comentario', async () => {
    await expect(
      service.rate('d1', 'cliente', {
        stars: 5,
        comment: 'escríbeme 04125551234',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deliveryRating.create).not.toHaveBeenCalled();
  });

  it('una sola calificación por entrega', async () => {
    prisma.deliveryRating.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      })
    );
    await expect(
      service.rate('d1', 'cliente', { stars: 3 })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getMyRating dice si todavía puede calificar', async () => {
    await expect(service.getMyRating('d1', 'cliente')).resolves.toEqual({
      rating: null,
      canRate: true,
    });
    await expect(service.getMyRating('d1', 'otro')).resolves.toBeNull();
  });
});
