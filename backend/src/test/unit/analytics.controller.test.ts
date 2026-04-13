import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsController } from '../../analytics/analytics.controller'
import { AnalyticsService } from '../../analytics/analytics.service'

describe('AnalyticsController', () => {
  let controller: AnalyticsController
  let service: AnalyticsService

  const mockAnalyticsService = {
    getSalesAnalytics: jest.fn(),
    getCustomerAnalytics: jest.fn(),
    getProductAnalytics: jest.fn(),
    getRevenueAnalytics: jest.fn(),
    getTopProducts: jest.fn(),
    getDashboardStats: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile()

    controller = module.get<AnalyticsController>(AnalyticsController)
    service = module.get<AnalyticsService>(AnalyticsService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getSalesAnalytics', () => {
    it('should return sales analytics', async () => {
      const commerceId = 'commerce-123'
      const queryDto = { period: 'today' }

      const expectedResult = {
        totalSales: 1000,
        averageOrder: 100,
        ordersCount: 10,
      }

      mockAnalyticsService.getSalesAnalytics.mockResolvedValue(expectedResult)

      const result = await controller.getSalesAnalytics(commerceId, queryDto)

      expect(result).toEqual(expectedResult)
      expect(service.getSalesAnalytics).toHaveBeenCalledWith(commerceId, queryDto)
    })
  })

  describe('getCustomerAnalytics', () => {
    it('should return customer analytics', async () => {
      const commerceId = 'commerce-123'
      const queryDto = { period: 'today' }

      const expectedResult = {
        totalCustomers: 50,
        customers: [],
      }

      mockAnalyticsService.getCustomerAnalytics.mockResolvedValue(expectedResult)

      const result = await controller.getCustomerAnalytics(commerceId, queryDto)

      expect(result).toEqual(expectedResult)
      expect(service.getCustomerAnalytics).toHaveBeenCalledWith(commerceId, queryDto)
    })
  })

  describe('getProductAnalytics', () => {
    it('should return product analytics', async () => {
      const commerceId = 'commerce-123'
      const queryDto = { period: 'today' }

      const expectedResult = {
        totalProducts: 20,
        products: [],
      }

      mockAnalyticsService.getProductAnalytics.mockResolvedValue(expectedResult)

      const result = await controller.getProductAnalytics(commerceId, queryDto)

      expect(result).toEqual(expectedResult)
      expect(service.getProductAnalytics).toHaveBeenCalledWith(commerceId, queryDto)
    })
  })

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics', async () => {
      const commerceId = 'commerce-123'
      const queryDto = { period: 'today' }

      const expectedResult = {
        totalRevenue: 1000,
        dailyRevenue: [],
      }

      mockAnalyticsService.getRevenueAnalytics.mockResolvedValue(expectedResult)

      const result = await controller.getRevenueAnalytics(commerceId, queryDto)

      expect(result).toEqual(expectedResult)
      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(commerceId, queryDto)
    })
  })

  describe('getTopProducts', () => {
    it('should return top products', async () => {
      const commerceId = 'commerce-123'
      const queryDto = { period: 'today', limit: 10 }

      const expectedResult = [
        { productId: '1', productName: 'Product 1', totalSold: 100 },
      ]

      mockAnalyticsService.getTopProducts.mockResolvedValue(expectedResult)

      const result = await controller.getTopProducts(commerceId, queryDto)

      expect(result).toEqual(expectedResult)
      expect(service.getTopProducts).toHaveBeenCalledWith(commerceId, queryDto)
    })
  })

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      const commerceId = 'commerce-123'

      const expectedResult = {
        sales: { totalSales: 1000 },
        customers: { totalCustomers: 50 },
        products: { totalProducts: 20 },
        revenue: { totalRevenue: 1000 },
      }

      mockAnalyticsService.getDashboardStats.mockResolvedValue(expectedResult)

      const result = await controller.getDashboardStats(commerceId)

      expect(result).toEqual(expectedResult)
      expect(service.getDashboardStats).toHaveBeenCalledWith(commerceId)
    })
  })
})
