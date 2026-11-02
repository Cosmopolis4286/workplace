import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../../domains/engagement/notifications/notifications.gateway';
import { NotificationType } from '@prisma/client';
import { MailService } from '../../domains/engagement/mail/mail.service';
import { PushService } from '../../domains/engagement/notifications/push.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    commerce: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockPushService = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockMailService = {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsGateway = {
    broadcast: jest.fn(),
    broadcastToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        { provide: MailService, useValue: mockMailService },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create notification for commerce', async () => {
      const commerceId = 'commerce-123';
      const dto = {
        type: NotificationType.ORDER,
        title: 'Test Notification',
        message: 'Test message',
      };

      const mockNotification = {
        id: 'notif-123',
        commerceId,
        ...dto,
        read: false,
        icon: 'ShoppingBagIcon',
        color: 'blue',
        metadata: undefined,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create(commerceId, dto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          commerceId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
        }),
      });
    });
  });

  describe('createForUser', () => {
    it('should create notification for user', async () => {
      const userId = 'user-123';
      const dto = {
        type: NotificationType.SYSTEM,
        title: 'User Notification',
        message: 'User message',
      };

      const mockNotification = {
        id: 'notif-123',
        userId,
        ...dto,
        read: false,
        icon: 'BellIcon',
        color: 'gray',
        metadata: undefined,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createForUser(userId, dto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          icon: 'BellIcon',
          color: 'gray',
          link: undefined,
          metadata: undefined,
        },
      });
    });
  });

  describe('notifyNewOrder', () => {
    it('should create order notification', async () => {
      const commerceId = 'commerce-123';
      const orderNumber = 'ORD-001';
      const total = 150.5;

      const mockNotification = {
        id: 'notif-789',
        commerceId,
        type: NotificationType.ORDER,
        title: `Nuevo pedido ${orderNumber}`,
        message: `Total: $${total}`,
        read: false,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.notifyNewOrder(
        commerceId,
        orderNumber,
        total
      );

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          commerceId,
          type: NotificationType.ORDER,
          title: `Nuevo pedido ${orderNumber}`,
        }),
      });
    });
  });

  describe('notifyLowStock', () => {
    it('should create low stock notification', async () => {
      const commerceId = 'commerce-123';
      const productName = 'Product A';
      const stock = 5;

      const mockNotification = {
        id: 'notif-101',
        commerceId,
        type: NotificationType.INVENTORY,
        title: 'Stock bajo',
        message: `El producto "${productName}" tiene solo ${stock} unidades disponibles`,
        read: false,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.notifyLowStock(
        commerceId,
        productName,
        stock
      );

      expect(result).toEqual(mockNotification);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications for commerce', async () => {
      const scope = { commerceId: 'commerce-123' };
      const query = { page: '1', limit: '10' };

      const mockNotifications = [
        { id: 'notif-1', title: 'Notif 1', read: false },
        { id: 'notif-2', title: 'Notif 2', read: true },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications
      );
      mockPrismaService.notification.count.mockResolvedValue(2);

      const result = await service.findAll(scope, query);

      expect(result.data).toEqual(mockNotifications);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter unread notifications', async () => {
      const scope = { userId: 'user-123' };
      const query = { unread: 'true', page: '1', limit: '10' };

      const mockNotifications = [
        { id: 'notif-1', title: 'Notif 1', read: false },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications
      );
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.findAll(scope, query);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: scope.userId, read: false },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const id = 'notif-123';
      const scope = { commerceId: 'commerce-123' };

      const mockNotification = {
        id,
        read: true,
        readAt: new Date(),
      };

      mockPrismaService.notification.update.mockResolvedValue(mockNotification);

      const result = await service.markAsRead(id, scope);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id, commerceId: scope.commerceId },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for commerce', async () => {
      const scope = { commerceId: 'commerce-123' };

      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(scope);

      expect(result).toEqual({
        message: 'Todas las notificaciones marcadas como leídas',
      });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { commerceId: scope.commerceId, read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });

    it('should mark all notifications as read for user', async () => {
      const scope = { userId: 'user-123' };

      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(scope);

      expect(result).toEqual({
        message: 'Todas las notificaciones marcadas como leídas',
      });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: scope.userId, read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('remove', () => {
    it('should delete notification', async () => {
      const id = 'notif-123';
      const scope = { commerceId: 'commerce-123' };

      mockPrismaService.notification.delete.mockResolvedValue({ id });

      const result = await service.remove(id, scope);

      expect(result).toEqual({ message: 'Notificación eliminada' });
      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({
        where: { id, commerceId: scope.commerceId },
      });
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications for commerce', async () => {
      const scope = { commerceId: 'commerce-123' };

      mockPrismaService.notification.deleteMany.mockResolvedValue({
        count: 10,
      });

      const result = await service.clearAll(scope);

      expect(result).toEqual({
        message: 'Todas las notificaciones eliminadas',
      });
      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { commerceId: scope.commerceId },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for commerce', async () => {
      const scope = { commerceId: 'commerce-123' };

      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(scope);

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { commerceId: scope.commerceId, read: false },
      });
    });

    it('should return unread count for user', async () => {
      const scope = { userId: 'user-123' };

      mockPrismaService.notification.count.mockResolvedValue(2);

      const result = await service.getUnreadCount(scope);

      expect(result).toEqual({ count: 2 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: scope.userId, read: false },
      });
    });
  });

  describe('notifyOrderStatusChange', () => {
    it('should create order status change notification', async () => {
      const commerceId = 'commerce-123';
      const orderNumber = 'ORD-001';
      const status = 'CONFIRMED';

      const mockNotification = {
        id: 'notif-202',
        commerceId,
        type: NotificationType.ORDER,
        title: `Pedido ${orderNumber} - ${status}`,
        read: false,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.notifyOrderStatusChange(
        commerceId,
        orderNumber,
        status
      );

      expect(result).toEqual(mockNotification);
    });
  });

  describe('notifyDeliveryStatusChange', () => {
    it('should create delivery status change notification', async () => {
      const commerceId = 'commerce-123';
      const orderNumber = 'ORD-001';
      const status = 'IN_TRANSIT';

      const mockNotification = {
        id: 'notif-303',
        commerceId,
        type: NotificationType.DELIVERY,
        title: `Envío ${orderNumber} - ${status}`,
        read: false,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.notifyDeliveryStatusChange(
        commerceId,
        orderNumber,
        status
      );

      expect(result).toEqual(mockNotification);
    });
  });

  describe('copia por email', () => {
    const flush = () => new Promise((r) => setImmediate(r));

    beforeEach(() => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'n1' });
    });

    it('una solicitud nueva le llega por email al proveedor', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        email: 'pro@test.com',
        firstName: 'Luis',
        isActive: true,
      });
      await service.notifyNewServiceRequest('pro-1', 'Ana', 'Plomería');
      await flush();
      expect(mockMailService.sendNotificationEmail).toHaveBeenCalledWith(
        'pro@test.com',
        'Luis',
        expect.stringContaining('Nueva solicitud'),
        expect.stringContaining('Plomería'),
        '/service-requests'
      );
    });

    it('no escribe a cuentas eliminadas (email anonimizado)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        email: 'eliminado-1@eliminado.invalid',
        firstName: 'x',
        isActive: false,
      });
      await service.notifyNewServiceRequest('pro-1', 'Ana', 'Plomería');
      await flush();
      expect(mockMailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('las notificaciones sin email (ej. mensajes del chat) no mandan correo', async () => {
      await service.notifyNewServiceRequestMessage(
        'u1',
        'Ana',
        'Plomería',
        'sr1'
      );
      await flush();
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockMailService.sendNotificationEmail).not.toHaveBeenCalled();
    });
  });

  it('cada notificación de usuario sale también por push con su link', async () => {
    mockPrismaService.notification.create.mockResolvedValue({
      id: 'n1',
      title: 't',
      message: 'm',
      link: '/service-requests',
      type: 'ORDER',
    });
    await service.notifyNewServiceRequest('pro-1', 'Ana', 'Plomería');
    expect(mockPushService.sendToUser).toHaveBeenCalledWith(
      'pro-1',
      expect.objectContaining({ link: '/service-requests' })
    );
  });
});
