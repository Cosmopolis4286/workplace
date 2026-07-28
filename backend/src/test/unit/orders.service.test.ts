import { Test, TestingModule } from '@nestjs/testing'
import { OrdersService } from '../../domains/operations/orders/orders.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { TelegramService } from '../../domains/engagement/telegram/telegram.service'
import { PlatformFeesService } from '../../domains/money/platform-fees/platform-fees.service'
import { OrderStatus } from '@prisma/client'
import { CreateOrderDto } from '../../domains/operations/orders/dto/create-order.dto'
import { UpdateOrderDto } from '../../domains/operations/orders/dto/update-order.dto'
import { QueryOrdersDto } from '../../domains/operations/orders/dto/query-orders.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('OrdersService', () => {
  let service: OrdersService
  let prismaService: PrismaService
  let notificationsService: NotificationsService
  let planLimitsService: typeof mockPlanLimitsService

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
    restaurantSettings: {
      findUnique: jest.fn(),
    },
    customer: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const mockNotificationsService = {
    notifyNewOrder: jest.fn().mockResolvedValue(undefined),
    notifyOrderStatusChange: jest.fn().mockResolvedValue(undefined),
  }

  const mockPlanLimitsService = {
    assertOrderLimit: jest.fn(),
    checkOrderLimit: jest.fn(),
    hasReachedOrderLimit: jest.fn(),
  }

  const mockTelegramService = {
    notifyCustomer: jest.fn().mockResolvedValue(undefined),
  }

  const mockPlatformFeesService = {
    resolveFeeConfig: jest.fn().mockResolvedValue(null),
    calculateFee: jest.fn().mockReturnValue({ feeAmount: 0 }),
    chargeProviderFee: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
          provide: PlatformFeesService,
          useValue: mockPlatformFeesService,
        },
      ],
    }).compile()

    service = module.get<OrdersService>(OrdersService)
    prismaService = module.get<PrismaService>(PrismaService)
    notificationsService = module.get<NotificationsService>(NotificationsService)
    planLimitsService = module.get(PLAN_LIMITS_FACADE)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getStats', () => {
    it('should return order statistics for a commerce', async () => {
      const commerceId = 'commerce-123'

      mockPrismaService.order.count.mockResolvedValue(100)
      mockPrismaService.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 20 },
        { status: 'CONFIRMED', _count: 30 },
        { status: 'DELIVERED', _count: 50 },
      ])
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 5000 } })
        .mockResolvedValueOnce({ _avg: { total: 50 } })

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        totalOrders: 100,
        activeOrders: 50,
        pendingOrders: 20,
        completedOrders: 50,
        cancelledOrders: 0,
        monthlyRevenue: 5000,
        avgTicket: 50,
      })
      expect(mockPrismaService.order.count).toHaveBeenCalledWith({
        where: { commerceId },
      })
    })

    it('should handle zero orders gracefully', async () => {
      const commerceId = 'commerce-123'

      mockPrismaService.order.count.mockResolvedValue(0)
      mockPrismaService.order.groupBy.mockResolvedValue([])
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _avg: { total: null } })

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        totalOrders: 0,
        activeOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        monthlyRevenue: 0,
        avgTicket: 0,
      })
    })
  })

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const commerceId = 'commerce-123'
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [
          { productId: 'product-1', productName: 'Product 1', quantity: 2, unitPrice: 10 },
          { productId: 'product-2', productName: 'Product 2', quantity: 1, unitPrice: 20 },
        ],
        notes: 'Test order',
      }

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
      }

      mockPrismaService.restaurantSettings.findUnique.mockResolvedValue(null)
      mockPrismaService.order.count.mockResolvedValue(0)
      mockPrismaService.order.create.mockResolvedValue(mockOrder)

      const result = await service.create(commerceId, createOrderDto)

      expect(result).toEqual(mockOrder)
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commerceId,
            customerName: 'John Doe',
            customerPhone: '+1234567890',
            notes: 'Test order',
            total: 40,
          }),
        })
      )
      expect(mockNotificationsService.notifyNewOrder).toHaveBeenCalled()
    })

    it('should throw error if order limit is reached', async () => {
      const commerceId = 'commerce-123'
      const userId = 'user-123'
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [{ productId: 'product-1', productName: 'Product 1', quantity: 1, unitPrice: 10 }],
      }

      mockPlanLimitsService.assertOrderLimit.mockRejectedValue(
        new Error('Order limit reached')
      )

      await expect(service.create(commerceId, createOrderDto, userId)).rejects.toThrow(
        'Order limit reached'
      )
    })

    it('should throw error if no items provided', async () => {
      const commerceId = 'commerce-123'
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        items: [],
      }

      await expect(service.create(commerceId, createOrderDto)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'
      const newStatus: OrderStatus = 'CONFIRMED'

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'PENDING',
        commerceId,
        customerId: null,
        total: 40,
        items: [],
      }

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        updatedAt: new Date(),
        items: [],
      }

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder)
      mockPrismaService.order.update.mockResolvedValue(updatedOrder)

      const result = await service.updateStatus(orderId, commerceId, newStatus)

      expect(result).toEqual(updatedOrder)
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({ status: newStatus }),
        })
      )
      expect(mockNotificationsService.notifyOrderStatusChange).toHaveBeenCalled()
    })

    it('should throw error for invalid status transition', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'
      const invalidStatus: OrderStatus = 'DELIVERED'

      const existingOrder = {
        id: orderId,
        orderNumber: 'ORD-2026-0001',
        status: 'PENDING',
        commerceId,
        customerId: null,
        total: 40,
        items: [],
      }

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder)

      await expect(service.updateStatus(orderId, commerceId, invalidStatus)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw error if order not found', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'
      const newStatus: OrderStatus = 'CONFIRMED'

      mockPrismaService.order.findFirst.mockResolvedValue(null)

      await expect(service.updateStatus(orderId, commerceId, newStatus)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: '1',
        limit: '10',
        status: 'PENDING' as OrderStatus,
      }

      const mockOrders = [
        { id: 'order-1', status: 'PENDING', items: [{ id: 'item-1' }] },
        { id: 'order-2', status: 'PENDING', items: [] },
      ]

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders)
      mockPrismaService.order.count.mockResolvedValue(2)

      const result = await service.findAll(commerceId, queryDto)

      expect(result).toEqual({
        data: [
          { id: 'order-1', status: 'PENDING', items: [{ id: 'item-1' }], itemCount: 1 },
          { id: 'order-2', status: 'PENDING', items: [], itemCount: 0 },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should apply filters correctly', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: '1',
        limit: '10',
        status: 'CONFIRMED' as OrderStatus,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.count.mockResolvedValue(0)

      await service.findAll(commerceId, queryDto)

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
      )
    })
  })

  describe('findOne', () => {
    it('should return order by id', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      const mockOrder = {
        id: orderId,
        commerceId,
        status: 'PENDING',
        items: [],
        customer: null,
      }

      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder)

      const result = await service.findOne(orderId, commerceId)

      expect(result).toEqual(mockOrder)
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: { id: orderId, commerceId },
        include: expect.objectContaining({ items: true }),
      })
    })

    it('should throw error if order not found', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      mockPrismaService.order.findFirst.mockResolvedValue(null)

      await expect(service.findOne(orderId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('should delete order successfully', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      const existingOrder = {
        id: orderId,
        commerceId,
        status: 'PENDING',
        items: [],
        customer: null,
        orderNumber: 'ORD-2026-0001',
        total: 40,
      }

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder)
      mockPrismaService.order.delete.mockResolvedValue(existingOrder)

      const result = await service.remove(orderId, commerceId)

      expect(result).toEqual({ message: 'Pedido eliminado' })
      expect(mockPrismaService.order.delete).toHaveBeenCalledWith({
        where: { id: orderId },
      })
    })

    it('should throw error if order is not in PENDING status', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      const existingOrder = {
        id: orderId,
        commerceId,
        status: 'CONFIRMED',
        items: [],
        customer: null,
      }

      mockPrismaService.order.findFirst.mockResolvedValue(existingOrder)

      await expect(service.remove(orderId, commerceId)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw error if order not found', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      mockPrismaService.order.findFirst.mockResolvedValue(null)

      await expect(service.remove(orderId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
