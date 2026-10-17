import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../domains/engagement/analytics/analytics.controller';
import { AnalyticsService } from '../../domains/engagement/analytics/analytics.service';
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    getOverview: jest.fn(),
  };

  const mockPermissionsService = {
    hasPermission: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return analytics overview', async () => {
      const userId = 'user-123';
      const queryDto = {
        period: '30d' as const,
        compareWith: 'previous' as const,
      };

      const expectedResult = {
        period: '30d',
        compareWith: 'previous',
        dateRange: {
          from: expect.any(String),
          to: expect.any(String),
        },
        previousDateRange: {
          from: expect.any(String),
          to: expect.any(String),
        },
        kpis: {
          totalRevenue: expect.any(Number),
          totalRevenueChange: expect.any(Number),
          totalOrders: expect.any(Number),
          totalOrdersChange: expect.any(Number),
          avgTicket: expect.any(Number),
          avgTicketChange: expect.any(Number),
          newCustomers: expect.any(Number),
          newCustomersChange: expect.any(Number),
        },
        revenueTrend: {
          labels: expect.any(Array),
          values: expect.any(Array),
        },
        ordersByHour: {
          labels: expect.any(Array),
          values: expect.any(Array),
        },
        topProducts: {
          labels: expect.any(Array),
          values: expect.any(Array),
          revenue: expect.any(Array),
        },
        customerSegments: {
          labels: expect.any(Array),
          values: expect.any(Array),
        },
        performance: {
          operational: {
            avgPrepTime: expect.any(Number),
            avgDeliveryTime: expect.any(Number),
            cancellationRate: expect.any(Number),
            cancellations: expect.any(Number),
            totalInPeriod: expect.any(Number),
          },
          growth: {
            newCustomers: expect.any(Number),
            retentionRate: expect.any(Number),
            clv: expect.any(Number),
            orderFrequency: expect.any(Number),
            totalCustomers: expect.any(Number),
          },
          financial: {
            grossMargin: expect.any(Number),
            avgTicket: expect.any(Number),
            totalRevenue: expect.any(Number),
            totalOrders: expect.any(Number),
          },
        },
      };

      mockAnalyticsService.getOverview.mockResolvedValue(expectedResult);

      const result = await controller.getOverview(
        { id: userId, role: 'PROFESIONAL' } as any,
        queryDto
      );

      expect(result).toEqual(expectedResult);
      expect(service.getOverview).toHaveBeenCalledWith(
        userId,
        'PROFESIONAL',
        queryDto
      );
    });
  });
});
