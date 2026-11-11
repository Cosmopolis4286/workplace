import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConversationsService } from '../../domains/engagement/conversations/conversations.service';

const BUYER = { id: 'buyer', role: Role.NORMAL };
const SELLER = { id: 'seller', role: Role.NORMAL };
const ADMIN = { id: 'admin', role: Role.ADMIN };

describe('ConversationsService', () => {
  let prisma: any;
  let resolver: any;
  let notifications: any;
  let service: ConversationsService;

  beforeEach(() => {
    prisma = {
      catalogOrder: {
        findUnique: jest.fn().mockResolvedValue({
          requesterId: 'buyer',
          commerceId: 'commerce-1',
          commerceName: 'Panadería',
        }),
      },
      commerce: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'seller' }),
      },
      report: {
        findUnique: jest.fn().mockResolvedValue({ reporterId: 'buyer' }),
      },
      conversationMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }: any) =>
          Promise.resolve({ id: 'm1', ...data })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    resolver = {
      find: jest.fn(async (userId: string) =>
        userId === 'seller' ? 'commerce-1' : null
      ),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    service = new ConversationsService(prisma, resolver, notifications);
  });

  describe('pedido de catálogo', () => {
    it('comprador y comercio conversan; avisa al otro lado', async () => {
      await service.send('CATALOG_ORDER', 'o1', BUYER, '¿A qué hora llega?');
      expect(notifications.createForUser).toHaveBeenCalledWith(
        'seller',
        expect.objectContaining({ link: '/orders' })
      );
      await service.send('CATALOG_ORDER', 'o1', SELLER, 'A las 5');
      expect(notifications.createForUser).toHaveBeenLastCalledWith(
        'buyer',
        expect.objectContaining({ link: '/my-orders' })
      );
    });

    it('nadie más puede leer ni escribir', async () => {
      await expect(
        service.list('CATALOG_ORDER', 'o1', { id: 'otro', role: Role.NORMAL })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza datos de contacto y no guarda el mensaje', async () => {
      await expect(
        service.send(
          'CATALOG_ORDER',
          'o1',
          SELLER,
          'mi whatsapp 0414 123 45 67'
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.conversationMessage.create).not.toHaveBeenCalled();
    });

    it('pedido inexistente → 404', async () => {
      prisma.catalogOrder.findUnique.mockResolvedValue(null);
      await expect(
        service.list('CATALOG_ORDER', 'nope', BUYER)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reporte', () => {
    it('quien reportó y soporte conversan; el mensaje de soporte queda marcado', async () => {
      const msg: any = await service.send(
        'REPORT',
        'r1',
        ADMIN,
        'Lo estamos revisando'
      );
      expect(msg.fromSupport).toBe(true);
      expect(notifications.createForUser).toHaveBeenCalledWith(
        'buyer',
        expect.objectContaining({ link: '/report-issue' })
      );
      await expect(
        service.send('REPORT', 'r1', BUYER, 'Gracias')
      ).resolves.toBeDefined();
    });

    it('otro usuario no accede al reporte ajeno', async () => {
      await expect(
        service.list('REPORT', 'r1', { id: 'otro', role: Role.NORMAL })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
