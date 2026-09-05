import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsService } from '../../domains/engagement/analytics/analytics.service'
import { CommerceAnalyticsStrategy } from '../../domains/engagement/analytics/strategies/commerce-analytics.strategy'
import { FreelancerAnalyticsStrategy } from '../../domains/engagement/analytics/strategies/freelancer-analytics.strategy'
import { PrismaService } from '../../prisma/prisma.service'
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'
import { AnalyticsPeriod } from '../../domains/engagement/analytics/dto/query-analytics.dto'

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let prismaService: PrismaService

  const mockPrismaService = {
    commerce: {
      findUnique: jest.fn(),
    },
    commerceSettings: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
  }

  const defaultMocks = () => {
    mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
    mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null)
    mockPrismaService.order.findMany.mockResolvedValue([])
    mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { total: 0 }, _avg: { total: 0 }, _count: { id: 0 } })
    mockPrismaService.order.count.mockResolvedValue(0)
    mockPrismaService.order.groupBy.mockResolvedValue([])
    mockPrismaService.orderItem.groupBy.mockResolvedValue([])
    mockPrismaService.customer.findMany.mockResolvedValue([])
    mockPrismaService.customer.groupBy.mockResolvedValue([])
    mockPrismaService.customer.aggregate.mockResolvedValue({
      _sum: { totalSpent: 0, totalOrders: 0 },
      _count: { id: 0 },
      _avg: { totalSpent: 0 },
    })
    mockPrismaService.customer.count.mockResolvedValue(0)
    mockPrismaService.product.findMany.mockResolvedValue([])
    mockPrismaService.product.aggregate.mockResolvedValue({ _avg: { price: 0, cost: 0 }, _sum: { stock: 0 } })
    mockPrismaService.product.count.mockResolvedValue(0)
    mockPrismaService.appointment.findMany.mockResolvedValue([])
    mockPrismaService.appointment.count.mockResolvedValue(0)
    mockPrismaService.appointment.groupBy.mockResolvedValue([])
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        CommerceAnalyticsStrategy,
        FreelancerAnalyticsStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CommerceResolverService,
          useValue: {
            resolve: jest.fn(async (userId: string) => {
              const commerce = await mockPrismaService.commerce.findUnique({ where: { userId } })
              return commerce?.id ?? userId
            }),
            resolveOrCreate: jest.fn(),
          },
        },
        {
          // Este suite solo ejercita el pipeline COMMERCE (ver
          // freelancer-analytics.strategy si existe un suite dedicado a
          // FREELANCER) — el servicio ahora resuelve el tipo de cuenta vía
          // AccountTypeResolver en vez de recibir `role` como parámetro.
          provide: AccountTypeResolver,
          useValue: { resolve: jest.fn().mockResolvedValue('COMMERCE') },
        },
      ],
    }).compile()

    service = module.get<AnalyticsService>(AnalyticsService)
    prismaService = module.get<PrismaService>(PrismaService)

    defaultMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getOverview', () => {
    it('should return analytics overview for today', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' as AnalyticsPeriod }

      // Mock user with commerce
      mockPrismaService.commerce.findUnique.mockResolvedValue({
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
        period: 'custom' as AnalyticsPeriod,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      mockPrismaService.commerce.findUnique.mockResolvedValue({
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

    it('should process unknown period using default range', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'invalid' as AnalyticsPeriod }

      // Service does not throw for unknown period — it falls through to the default (30d) range
      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.period).toBe('invalid')
    })

    it('should fall back to userId as commerceId if user has no commerce', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' as AnalyticsPeriod }

      // getCommerceId falls back to userId when there's no commerce, so
      // the overview still resolves (with empty/zeroed metrics) instead of throwing.
      mockPrismaService.commerce.findUnique.mockResolvedValue(null)

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
      expect(result.kpis.totalRevenue).toBe(0)
    })

    it('should handle week period correctly', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'week' as AnalyticsPeriod }

      mockPrismaService.commerce.findUnique.mockResolvedValue({
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
      const queryDto = { period: 'quarter' as AnalyticsPeriod }

      mockPrismaService.commerce.findUnique.mockResolvedValue({
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
      const queryDto = { period: 'today' as AnalyticsPeriod }

      mockPrismaService.commerce.findUnique.mockResolvedValue({
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
      expect(result.performance.operational).toBeDefined()
      expect(result.performance.growth).toBeDefined()
      expect(result.performance.financial).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' as AnalyticsPeriod }

      mockPrismaService.commerce.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow(
        'Database error'
      )
    })

    it('should handle missing commerce by falling back to userId', async () => {
      const userId = 'user-123'
      const queryDto = { period: 'today' as AnalyticsPeriod }

      mockPrismaService.commerce.findUnique.mockResolvedValue(null)

      const result = await service.getOverview(userId, queryDto)

      expect(result).toBeDefined()
    })

    it('should throw when date range for custom period is invalid', async () => {
      const userId = 'user-123'
      const queryDto = {
        period: 'custom' as AnalyticsPeriod,
        dateFrom: 'invalid-date',
        dateTo: '2024-01-31',
      }

      mockPrismaService.commerce.findUnique.mockResolvedValue({
        id: userId,
        commerceId: 'commerce-123',
        role: 'OWNER',
      })

      await expect(service.getOverview(userId, queryDto)).rejects.toThrow()
    })
  })
})
