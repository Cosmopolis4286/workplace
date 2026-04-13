import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsService } from '../../analytics/analytics.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException, ForbiddenException } from '@nestjs/common'

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let prismaService: PrismaService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<AnalyticsService>(AnalyticsService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getOverview', () => {
    it('should return analytics overview for today', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' }

      // Mock user with commerce
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      // Mock orders data
      mockPrismaService.order.findMany.mockResolvedValue([
        { id: '1', total: 100, createdAt: new Date() },
        { id: '2', total: 200, createdAt: new Date() },
      ])

      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 300 },
        _avg: { total: 150 },
        _count: { id: 2 },
      })

      // Mock customer segments
      mockPrismaService.customer.groupBy.mockResolvedValue([
        { segment: 'PREMIUM', _count: { id: 10 } },
        { segment: 'REGULAR', _count: { id: 20 } },
      ])

      // Mock products
      mockPrismaService.product.findMany.mockResolvedValue([
        { name: 'Product 1', stock: 50, maxStock: 100, price: 10 },
        { name: 'Product 2', stock: 30, maxStock: 80, price: 15 },
      ])

      // Mock appointments
      mockPrismaService.appointment.findMany.mockResolvedValue([
        { date: new Date() },
        { date: new Date() },
      ])

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.period).toBe('today')
      expect(result.kpis).toBeDefined()
      expect(result.revenueTrend).toBeDefined()
      expect(result.ordersByHour).toBeDefined()
      expect(result.topProducts).toBeDefined()
      expect(result.customerSegments).toBeDefined()
    })

    it('should return analytics overview for custom date range', async () => {
      const userId = 'user-123'
      const queryDto = {
        period: 'custom',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 0 },
        _avg: { total: 0 },
        _count: { id: 0 },
      })

      mockPrismaService.customer.groupBy.mockResolvedValue([])
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.appointment.findMany.mockResolvedValue([])

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.period).toBe('custom')
      expect(result.dateRange).toBeDefined()
    })

    it('should throw BadRequestException for invalid period', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'invalid' }

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw ForbiddenException if user has no commerce', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: null,
        role: 'USER',
      })

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should handle week period correctly', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'week' }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 0 },
        _avg: { total: 0 },
        _count: { id: 0 },
      })

      mockPrismaService.customer.groupBy.mockResolvedValue([])
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.appointment.findMany.mockResolvedValue([])

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.period).toBe('week')
      expect(result.compareWith).toBeDefined()
    })

    it('should handle quarter period correctly', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'quarter' }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      mockPrismaService.order.findMany.mockResolvedValue([])
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 0 },
        _avg: { total: 0 },
        _count: { id: 0 },
      })

      mockPrismaService.customer.groupBy.mockResolvedValue([])
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.appointment.findMany.mockResolvedValue([])

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.period).toBe('quarter')
    })

    it('should include performance metrics', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      mockPrismaService.order.findMany.mockResolvedValue([
        { id: '1', total: 100, createdAt: new Date() },
      ])

      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 100 },
        _avg: { total: 100 },
        _count: { id: 1 },
      })

      mockPrismaService.customer.groupBy.mockResolvedValue([
        { segment: 'PREMIUM', _count: { id: 5 } },
      ])

      mockPrismaService.product.findMany.mockResolvedValue([
        { name: 'Product 1', stock: 50, maxStock: 100, price: 10 },
      ])

      mockPrismaService.appointment.findMany.mockResolvedValue([
        { date: new Date() },
      ])

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.performance).toBeDefined()
      expect(result.performance.avgOrderValue).toBeDefined()
      expect(result.performance.conversionRate).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' }

      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        'Database error'
      )
    })

    it('should handle missing user', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' }

      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should validate date range for custom period', async () => {
      const userId = 'user-123'
      const queryDto = {
        period: 'custom',
        dateFrom: 'invalid-date',
        dateTo: '2024-01-31',
      }

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        BadRequestException
      )
    })
  })
})
