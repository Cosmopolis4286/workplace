import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../../domains/operations/orders/orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade';
import { TelegramService } from '../../domains/engagement/telegram/telegram.service';
import { PLATFORM_FEES_FACADE } from '../../domains/money/platform-fees/platform-fees.facade';
import { REPUTATION_FACADE } from '../../domains/reputation/reputation.facade';
import { ReceiptsService } from '../../domains/operations/receipts/receipts.service';
import { CashService } from '../../domains/operations/cash/cash.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from '../../domains/operations/orders/dto/create-order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { money } from '../money-matcher';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    commerceSettings: {
      findUnique: jest.fn(),
    },
    customer: {
      update: jest.fn(),
    },
    commerce: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((callback: (tx: any) => unknown) =>
      callback(mockPrismaService)
    ),
  };

  const mockNotificationsService = {
    notifyNewOrder: jest.fn().mockResolvedValue(undefined),
    notifyOrderStatusChange: jest.fn().mockResolvedValue(undefined),
  };

  const mockPlanLimitsService = {
    assertOrderLimit: jest.fn(),
    checkOrderLimit: jest.fn(),
    hasReachedOrderLimit: jest.fn(),
  };

  const mockTelegramService = {
    notifyCustomer: jest.fn().mockResolvedValue(undefined),
  };

  const mockPlatformFeesService = {
    resolveFeeConfig: jest.fn().mockResolvedValue(null),
    calculateFee: jest.fn().mockReturnValue({ feeAmount: 0 }),
    chargeProviderFee: jest.fn().mockResolvedValue(undefined),
  };

  const mockReputationService = {
    recalculate: jest.fn().mockResolvedValue(undefined),
    getScore: jest.fn().mockResolvedValue(null),
  };

  const mockReceiptsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const mockCashService = {
    hasOpenSession: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CommerceResolverService,
          useValue: { resolve: jest.fn(), resolveOrCreate: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PLAN_LIMITS_FACADE,
          useValue: mockPlanLimitsService,
        },
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
        {
          provide: PLATFORM_FEES_FACADE,
          useValue: mockPlatformFeesService,
        },
        {
          provide: REPUTATION_FACADE,
          useValue: mockReputationService,
        },
        {
          provide: ReceiptsService,
          useValue: mockReceiptsService,
        },
        {
          provide: CashService,
          useValue: mockCashService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return order statistics for a commerce', async () => {
      const commerceId = 'commerce-123';

      mockPrismaService.order.count.mockResolvedValue(100);
      mockPrismaService.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 20 },
        { status: 'CONFIRMED', _count: 30 },
        { status: 'DELIVERED', _count: 50 },
      ]);
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 5000 } })
        .mockResolvedValueOnce({ _avg: { total: 50 } });

      const result = await service.getStats(commerceId);

      expect(result).toEqual({
        totalOrders: 100,
        activeOrders: 50,
        pendingOrders: 20,
        completedOrders: 50,
        cancelledOrders: 0,
        monthlyRevenue: 5000,
        avgTicket: 50,
      });
      expect(mockPrismaService.order.count).toHaveBeenCalledWith({
        where: { commerceId },
      });
    });

    it('should handle zero orders gracefully', async () => {
      const commerceId = 'commerce-123';

      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.groupBy.mockResolvedValue([]);
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _avg: { total: null } });

      const result = await service.getStats(commerceId);

      expect(result).toEqual({
        totalOrders: 0,
        activeOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        monthlyRevenue: 0,
        avgTicket: 0,
      });
    });
  });

  describe('getPlatformStats (SUPERADMIN/ADMIN)', () => {
    it('aggregates order statistics across ALL commerces, without a commerceId filter', async () => {
      mockPrismaService.order.count.mockResolvedValue(500);
      mockPrismaService.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 40 },
        { status: 'DELIVERED', _count: 400 },
        { status: 'CANCELLED', _count: 60 },
      ]);
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 100000 } })
        .mockResolvedValueOnce({ _avg: { total: 250 } });

      const result = await service.getPlatformStats();

      expect(result).toEqual({
        totalOrders: 500,
        activeOrders: 40,
        pendingOrders: 40,
        completedOrders: 400,
        cancelledOrders: 60,
        monthlyRevenue: 100000,
        avgTicket: 250,
      });
      expect(mockPrismaService.order.count).toHaveBeenCalledWith();
      const groupByArgs = mockPrismaService.order.groupBy.mock.calls[0][0];
      expect(groupByArgs.where).toBeUndefined();
    });
  });

  describe('getPlatformRecent (SUPERADMIN/ADMIN)', () => {
    it('returns active orders across the platform with the commerce name attached', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'o1',
          status: 'PENDING',
          items: [{ id: 'i1' }],
          commerce: { id: 'c1', name: 'Comercio Uno' },
        },
      ]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.getPlatformRecent(10);

      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: 'o1',
        itemCount: 1,
        commerce: { name: 'Comercio Uno' },
      });
      const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).not.toHaveProperty('commerceId');
      expect(findManyArgs.take).toBe(10);
    });

    it('clamps the limit to the [1, 50] range', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.getPlatformRecent(500);
      expect(mockPrismaService.order.findMany.mock.calls[0][0].take).toBe(50);

      await service.getPlatformRecent(-5);
      expect(mockPrismaService.order.findMany.mock.calls[1][0].take).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const commerceId = 'commerce-123';
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [
          {
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 2,
            unitPrice: 10,
          },
          {
            productId: 'product-2',
            productName: 'Product 2',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        notes: 'Test order',
      };

      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2026-0001',
        commerceId,
        status: 'PENDING',
        subtotal: 40,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        total: 40,
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        notes: 'Test order',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(commerceId, createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commerceId,
            customerName: 'John Doe',
            customerPhone: '+1234567890',
            notes: 'Test order',
            total: money(40),
          }),
        })
      );
      expect(mockNotificationsService.notifyNewOrder).toHaveBeenCalled();
    });

    it('should throw error if order limit is reached', async () => {
      const commerceId = 'commerce-123';
      const userId = 'user-123';
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [
          {
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 10,
          },
        ],
      };

      mockPlanLimitsService.assertOrderLimit.mockRejectedValue(
        new Error('Order limit reached')
      );

      await expect(
        service.create(commerceId, createOrderDto, userId)
      ).rejects.toThrow('Order limit reached');
    });

    it('should throw error if no items provided', async () => {
      const commerceId = 'commerce-123';
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        items: [],
      };

      await expect(service.create(commerceId, createOrderDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw error if discount exceeds subtotal+tax+deliveryFee', async () => {
      const commerceId = 'commerce-123';
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        items: [
          {
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 10,
          },
        ],
        discount: 999,
      };

      mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);

      await expect(service.create(commerceId, createOrderDto)).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    it('calcula subtotal, IVA y total exactos al centavo y cuadra con las líneas', async () => {
      const commerceId = 'commerce-123';
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue({
        tax: 16,
      });
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });

      await service.create(commerceId, {
        customerName: 'John Doe',
        items: [
          // 3 × 0.1 = 0.30000000000000004 en Float
          { productId: 'p1', productName: 'A', quantity: 3, unitPrice: 0.1 },
          // 1.005 × 1: HALF_UP → 1.01 (Float daba 1.00)
          { productId: 'p2', productName: 'B', quantity: 1, unitPrice: 1.005 },
        ],
        deliveryFee: 0.2,
        discount: 0.1,
      } as CreateOrderDto);

      const data = mockPrismaService.order.create.mock.calls[0][0].data;
      const lines = data.items.create.map((i: any) => i.subtotal.toString());
      expect(lines).toEqual(['0.3', '1.01']);
      expect(data.subtotal.toString()).toBe('1.31');
      expect(data.tax.toString()).toBe('0.21'); // 1.31 × 16% = 0.2096
      // 1.31 + 0.21 + 0.2 − 0.1 = 1.62
      expect(data.total.toString()).toBe('1.62');
    });

    it('reintenta con el siguiente número si el correlativo ya existe (P2002)', async () => {
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.order.count.mockResolvedValue(3);
      const clash = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['commerceId', 'orderNumber'] },
      });
      mockPrismaService.order.create
        .mockRejectedValueOnce(clash)
        .mockResolvedValueOnce({ id: 'order-1', orderNumber: 'ORD-X-0005' });

      await service.create('commerce-123', {
        customerName: 'John Doe',
        items: [
          { productId: 'p1', productName: 'A', quantity: 1, unitPrice: 1 },
        ],
      } as CreateOrderDto);

      const numbers = mockPrismaService.order.create.mock.calls.map(
        (c: any[]) => c[0].data.orderNumber
      );
      expect(numbers[0]).toMatch(/-0004$/);
      expect(numbers[1]).toMatch(/-0005$/);
    });

    it('should allow a discount equal to the order total', async () => {
      const commerceId = 'commerce-123';
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        items: [
          {
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 10,
          },
        ],
        discount: 10,
      };

      mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-1',
        total: 0,
      });

      await service.create(commerceId, createOrderDto);

      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ total: money(0) }),
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';
      const newStatus: OrderStatus = 'CONFIRMED';

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'PENDING',
        commerceId,
        customerId: null,
        total: 40,
        items: [],
      };

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        updatedAt: new Date(),
        items: [],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus(orderId, commerceId, newStatus);

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({ status: newStatus }),
        })
      );
      expect(
        mockNotificationsService.notifyOrderStatusChange
      ).toHaveBeenCalled();
    });

    it('should throw error for invalid status transition', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';
      const invalidStatus: OrderStatus = 'DELIVERED';

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'PENDING',
        commerceId,
        customerId: null,
        total: 40,
        items: [],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);

      await expect(
        service.updateStatus(orderId, commerceId, invalidStatus)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not found', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';
      const newStatus: OrderStatus = 'CONFIRMED';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(orderId, commerceId, newStatus)
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza completar una venta en efectivo si no hay caja abierta', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'READY',
        commerceId,
        customerId: null,
        total: 40,
        paymentMethod: 'CASH',
        items: [],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockCashService.hasOpenSession.mockResolvedValue(false);

      await expect(
        service.updateStatus(orderId, commerceId, 'DELIVERED')
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });

    it('permite completar una venta en efectivo si hay caja abierta, y emite el comprobante', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'READY',
        commerceId,
        customerId: null,
        total: 40,
        paymentMethod: 'CASH',
        items: [],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        status: 'DELIVERED',
      });
      mockCashService.hasOpenSession.mockResolvedValue(true);

      await service.updateStatus(orderId, commerceId, 'DELIVERED');

      expect(mockPrismaService.order.update).toHaveBeenCalled();
      expect(mockReceiptsService.create).toHaveBeenCalledWith(
        commerceId,
        orderId
      );
    });

    it('no valida caja abierta para métodos de pago distintos de efectivo', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'READY',
        commerceId,
        customerId: null,
        total: 40,
        paymentMethod: 'CARD',
        items: [],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        status: 'DELIVERED',
      });
      mockCashService.hasOpenSession.mockResolvedValue(false);

      await service.updateStatus(orderId, commerceId, 'DELIVERED');

      expect(mockPrismaService.order.update).toHaveBeenCalled();
    });
  });

  describe('estadísticas del cliente', () => {
    it('entregar no vuelve a sumar el total al cliente (ya se sumó al crear)', async () => {
      const existingOrder = {
        id: 'order-7',
        orderNumber: 'ORD-2026-0007',
        status: 'READY',
        commerceId: 'commerce-123',
        customerId: 'cust-1',
        total: 25,
        paymentMethod: 'CARD',
        items: [],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        status: 'DELIVERED',
      });
      mockPrismaService.customer.update.mockClear();

      await service.updateStatus('order-7', 'commerce-123', 'DELIVERED');

      expect(mockPrismaService.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('comisión de pedidos POS', () => {
    it('al crear, usa la tasa del dueño del comercio y no la de quien opera el POS', async () => {
      mockPlanLimitsService.assertOrderLimit.mockResolvedValue(undefined);
      mockPrismaService.commerce.findUnique.mockResolvedValueOnce({
        userId: 'owner-1',
      });
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'o-1',
        items: [],
      });
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue({
        tax: 0,
      });

      await service.create(
        'commerce-123',
        {
          customerName: 'Ana',
          items: [{ productName: 'Café', quantity: 1, unitPrice: 2 }],
        } as any,
        'employee-1'
      );

      expect(mockPlatformFeesService.resolveFeeConfig).toHaveBeenCalledWith(
        'ORDER',
        'owner-1'
      );
    });

    it('al entregar, la comisión que pagó el cliente se carga al estado de cuenta del comercio', async () => {
      const existingOrder = {
        id: 'order-9',
        orderNumber: 'ORD-2026-0009',
        status: 'READY',
        commerceId: 'commerce-123',
        customerId: null,
        total: 44,
        paymentMethod: 'CARD',
        platformFeePayer: 'CLIENT',
        platformFeeAmount: 4,
        items: [],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...existingOrder,
        status: 'DELIVERED',
      });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });

      await service.updateStatus('order-9', 'commerce-123', 'DELIVERED');

      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'ORDER',
        'owner-1',
        4,
        'FEE-ORDER-order-9',
        { orderId: 'order-9', paidByClient: true }
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const commerceId = 'commerce-123';
      const queryDto = {
        page: '1',
        limit: '10',
        status: 'PENDING' as OrderStatus,
      };

      const mockOrders = [
        { id: 'order-1', status: 'PENDING', items: [{ id: 'item-1' }] },
        { id: 'order-2', status: 'PENDING', items: [] },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll(commerceId, queryDto);

      expect(result).toEqual({
        data: [
          {
            id: 'order-1',
            status: 'PENDING',
            items: [{ id: 'item-1' }],
            itemCount: 1,
          },
          { id: 'order-2', status: 'PENDING', items: [], itemCount: 0 },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const commerceId = 'commerce-123';
      const queryDto = {
        page: '1',
        limit: '10',
        status: 'CONFIRMED' as OrderStatus,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll(commerceId, queryDto);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            commerceId,
            status: 'CONFIRMED',
            createdAt: expect.objectContaining({
              gte: new Date('2024-01-01'),
            }),
          }),
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const mockOrder = {
        id: orderId,
        commerceId,
        status: 'PENDING',
        items: [],
        customer: null,
      };

      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId, commerceId);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: { id: orderId, commerceId },
        include: expect.objectContaining({ items: true }),
      });
    });

    it('should throw error if order not found', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orderId, commerceId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should delete order successfully', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const existingOrder = {
        id: orderId,
        commerceId,
        status: 'PENDING',
        items: [],
        customer: null,
        orderNumber: 'ORD-2026-0001',
        total: 40,
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);
      mockPrismaService.order.delete.mockResolvedValue(existingOrder);

      const result = await service.remove(orderId, commerceId);

      expect(result).toEqual({ message: 'Pedido eliminado' });
      expect(mockPrismaService.order.delete).toHaveBeenCalledWith({
        where: { id: orderId },
      });
    });

    it('should throw error if order is not in PENDING status', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      const existingOrder = {
        id: orderId,
        commerceId,
        status: 'CONFIRMED',
        items: [],
        customer: null,
      };

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder);

      await expect(service.remove(orderId, commerceId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw error if order not found', async () => {
      const orderId = 'order-123';
      const commerceId = 'commerce-123';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.remove(orderId, commerceId)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
