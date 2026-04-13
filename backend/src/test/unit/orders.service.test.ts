import { Test, TestingModule } from '@nestjs/testing'
import { OrdersService } from '../../orders/orders.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { PlanLimitsService } from '../../plans/plan-limits.service'
import { OrderStatus } from '@prisma/client'
import { CreateOrderDto } from '../../orders/dto/create-order.dto'
import { UpdateOrderDto } from '../../orders/dto/update-order.dto'
import { QueryOrdersDto } from '../../orders/dto/query-orders.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('OrdersService', () => {
  let service: OrdersService
  let prismaService: PrismaService
  let notificationsService: NotificationsService
  let planLimitsService: PlanLimitsService

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const mockNotificationsService = {
    sendOrderNotification: jest.fn(),
    sendOrderStatusUpdate: jest.fn(),
  }

  const mockPlanLimitsService = {
    checkOrderLimit: jest.fn(),
    hasReachedOrderLimit: jest.fn(),
  }

  beforeEach(async () => {
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
          provide: PlanLimitsService,
          useValue: mockPlanLimitsService,
        },
      ],
    }).compile()

    service = module.get<OrdersService>(OrdersService)
    prismaService = module.get<PrismaService>(PrismaService)
    notificationsService = module.get<NotificationsService>(NotificationsService)
    planLimitsService = module.get<PlanLimitsService>(PlanLimitsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getStats', () => {
    it('should return order statistics for a commerce', async () => {
      const commerceId = 'commerce-123'
      const mockStats = {
        total: 100,
        byStatus: [
          { status: 'PENDIENTE', _count: 20 },
          { status: 'CONFIRMADO', _count: 30 },
          { status: 'ENTREGADO', _count: 50 },
        ],
        monthlyRevenue: { _sum: { total: 5000 } },
        avgTicket: { _avg: { total: 50 } },
      }

      mockPrismaService.order.count.mockResolvedValue(mockStats.total)
      mockPrismaService.order.groupBy.mockResolvedValue(mockStats.byStatus)
      mockPrismaService.order.aggregate
        .mockResolvedValueOnce(mockStats.monthlyRevenue)
        .mockResolvedValueOnce(mockStats.avgTicket)

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 100,
        byStatus: {
          PENDIENTE: 20,
          CONFIRMADO: 30,
          ENTREGADO: 50,
        },
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
        total: 0,
        byStatus: {},
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
        commerceId,
        status: 'PENDIENTE',
        total: 40,
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        notes: 'Test order',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPlanLimitsService.checkOrderLimit.mockResolvedValue(true)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService)
      })
      mockPrismaService.order.create.mockResolvedValue(mockOrder)
      mockPrismaService.orderItem.createMany.mockResolvedValue({ count: 2 })

      const result = await service.create(commerceId, createOrderDto)

      expect(result).toEqual(mockOrder)
      expect(mockPlanLimitsService.checkOrderLimit).toHaveBeenCalledWith(commerceId)
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          notes: 'Test order',
          status: 'PENDIENTE',
          total: 40,
        },
      })
      expect(mockNotificationsService.sendOrderNotification).toHaveBeenCalledWith(
        mockOrder,
        'created'
      )
    })

    it('should throw error if order limit is reached', async () => {
      const commerceId = 'commerce-123'
      const createOrderDto: CreateOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [{ productId: 'product-1', productName: 'Product 1', quantity: 1, unitPrice: 10 }],
      }

      mockPlanLimitsService.checkOrderLimit.mockRejectedValue(
        new Error('Order limit reached')
      )

      await expect(service.create(commerceId, createOrderDto)).rejects.toThrow(
        'Order limit reached'
      )
    })
  })

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123'
      const newStatus: OrderStatus = 'CONFIRMADO'
      
      const existingOrder = {
        id: orderId,
        status: 'PENDIENTE',
        commerceId: 'commerce-123',
      }

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        updatedAt: new Date(),
      }

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder)
      mockPrismaService.order.update.mockResolvedValue(updatedOrder)

      const result = await service.updateStatus(orderId, newStatus)

      expect(result).toEqual(updatedOrder)
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: newStatus },
      })
      expect(mockNotificationsService.sendOrderStatusUpdate).toHaveBeenCalledWith(
        updatedOrder,
        newStatus
      )
    })

    it('should throw error for invalid status transition', async () => {
      const orderId = 'order-123'
      const invalidStatus: OrderStatus = 'ENTREGADO'
      
      const existingOrder = {
        id: orderId,
        status: 'PENDIENTE',
        commerceId: 'commerce-123',
      }

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder)

      await expect(service.updateStatus(orderId, invalidStatus)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw error if order not found', async () => {
      const orderId = 'order-123'
      const newStatus: OrderStatus = 'CONFIRMADO'

      mockPrismaService.order.findUnique.mockResolvedValue(null)

      await expect(service.updateStatus(orderId, newStatus)).rejects.toThrow(
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
        status: 'PENDIENTE' as OrderStatus,
      }

      const mockOrders = [
        { id: 'order-1', status: 'PENDIENTE' },
        { id: 'order-2', status: 'PENDIENTE' },
      ]

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders)
      mockPrismaService.order.count.mockResolvedValue(2)

      const result = await service.findAll(commerceId, queryDto)

      expect(result).toEqual({
        orders: mockOrders,
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
        status: 'CONFIRMADO' as OrderStatus,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.count.mockResolvedValue(0)

      await service.findAll(commerceId, queryDto)

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: {
          commerceId,
          status: 'CONFIRMADO',
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findOne', () => {
    it('should return order by id', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'
      
      const mockOrder = {
        id: orderId,
        commerceId,
        status: 'PENDIENTE',
        items: [],
      }

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder)

      const result = await service.findOne(orderId, commerceId)

      expect(result).toEqual(mockOrder)
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: { items: true },
      })
    })

    it('should throw error if order not found', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'

      mockPrismaService.order.findUnique.mockResolvedValue(null)

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
        status: 'PENDIENTE',
      }

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService)
      })
      mockPrismaService.order.delete.mockResolvedValue(existingOrder)

      const result = await service.remove(orderId, commerceId)

      expect(result).toEqual(existingOrder)
      expect(mockPrismaService.order.delete).toHaveBeenCalledWith({
        where: { id: orderId },
      })
    })

    it('should throw error if order is not in PENDIENTE status', async () => {
      const orderId = 'order-123'
      const commerceId = 'commerce-123'
      
      const existingOrder = {
        id: orderId,
        commerceId,
        status: 'CONFIRMADO',
      }

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder)

      await expect(service.remove(orderId, commerceId)).rejects.toThrow(
        BadRequestException
      )
    })
  })
})
