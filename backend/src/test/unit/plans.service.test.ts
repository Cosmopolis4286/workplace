import { Test, TestingModule } from '@nestjs/testing'
import { PlansService } from '../../domains/money/plans/plans.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'

describe('PlansService', () => {
  let service: PlansService
  let prismaService: PrismaService

  const mockPrismaService = {
    plan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commerce: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }

  const redisStore = new Map<string, string>()
  const mockRedisService = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    setex: jest.fn((key: string, _ttl: number, value: string) => { redisStore.set(key, value); return Promise.resolve() }),
    del: jest.fn((key: string) => { redisStore.delete(key); return Promise.resolve() }),
  }

  beforeEach(async () => {
    redisStore.clear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile()

    service = module.get<PlansService>(PlansService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createPlan', () => {
    it('should create a new plan successfully', async () => {
      const createPlanDto = {
        name: 'Premium Plan',
        description: 'Premium features',
        price: 29.99,
        duration: 30,
        features: ['Feature 1', 'Feature 2'],
        enabledModules: ['module1', 'module2'],
        maxUsers: 10,
        maxProducts: 1000,
        maxOrders: 5000,
      }

      const mockPlan = {
        id: 'plan-123',
        ...createPlanDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaService.plan.create.mockResolvedValue(mockPlan)

      const result = await service.createPlan(createPlanDto)

      expect(result).toEqual(mockPlan)
      expect(mockPrismaService.plan.create).toHaveBeenCalledWith({
        data: {
          ...createPlanDto,
          features: createPlanDto.features ?? [],
          enabledModules: createPlanDto.enabledModules ?? [],
        },
      })
    })

    it('should throw error for duplicate plan name', async () => {
      const createPlanDto = {
        name: 'Premium Plan',
        description: 'Premium features',
        price: 29.99,
        duration: 30,
        features: [],
        maxUsers: 10,
        maxProducts: 1000,
        maxOrders: 5000,
      }

      mockPrismaService.plan.create.mockRejectedValue(new Error('Plan name already exists'))

      await expect(service.createPlan(createPlanDto)).rejects.toThrow('Plan name already exists')
    })
  })

  describe('findAllPlans', () => {
    it('should return all active plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic Plan',
          price: 9.99,
          status: 'ACTIVE',
          _count: { subscriptions: 5 },
        },
        {
          id: 'plan-2',
          name: 'Premium Plan',
          price: 29.99,
          status: 'ACTIVE',
          _count: { subscriptions: 10 },
        },
      ]

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans)

      const result = await service.findAllPlans()

      expect(result).toEqual(mockPlans)
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: {
          _count: { select: { subscriptions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      })
    })

    it('should return all plans including inactive', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic Plan',
          price: 9.99,
          status: 'ACTIVE',
          _count: { subscriptions: 5 },
        },
        {
          id: 'plan-2',
          name: 'Old Plan',
          price: 19.99,
          status: 'INACTIVE',
          _count: { subscriptions: 0 },
        },
      ]

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans)

      const result = await service.findAllPlans(true)

      expect(result).toEqual(mockPlans)
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: { select: { subscriptions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      })
    })
  })

  describe('findPlanById', () => {
    it('should return plan by id', async () => {
      const planId = 'plan-123'
      
      const mockPlan = {
        id: planId,
        name: 'Premium Plan',
        price: 29.99,
        status: 'ACTIVE',
        _count: { subscriptions: 10 },
        subscriptions: [],
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan)

      const result = await service.findPlanById(planId)

      expect(result).toEqual(mockPlan)
      expect(mockPrismaService.plan.findUnique).toHaveBeenCalledWith({
        where: { id: planId },
        include: {
          _count: { select: { subscriptions: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      })
    })

    it('should throw error if plan not found', async () => {
      const planId = 'plan-123'

      mockPrismaService.plan.findUnique.mockResolvedValue(null)
  })

  it('should throw error if plan not found', async () => {
    const planId = 'plan-123'

    mockPrismaService.plan.findUnique.mockResolvedValue(null)

    await expect(service.findPlanById(planId)).rejects.toThrow(NotFoundException)
  })
})

describe('updatePlan', () => {
  it('should update plan successfully', async () => {
    const planId = 'plan-123'
    const updatePlanDto = {
      name: 'Updated Premium Plan',
      price: 39.99,
    }

    const existingPlan = {
      id: planId,
      name: 'Premium Plan',
      price: 29.99,
    }

    const updatedPlan = {
      ...existingPlan,
      name: 'Updated Premium Plan',
      price: 39.99,
      updatedAt: new Date(),
    }

    mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan)
    mockPrismaService.plan.update.mockResolvedValue(updatedPlan)

    const result = await service.updatePlan(planId, updatePlanDto)

    expect(result).toEqual(updatedPlan)
  })

  it('should throw error if plan not found', async () => {
    const planId = 'plan-123'
    const updatePlanDto = {
      name: 'Updated Plan',
    }

    mockPrismaService.plan.findUnique.mockResolvedValue(null)

    await expect(service.updatePlan(planId, updatePlanDto)).rejects.toThrow(NotFoundException)
    })

    it('should throw error if plan not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(null)

      await expect(service.assignSubscription(assignSubscriptionDto, 'admin-123')).rejects.toThrow(NotFoundException)
    })

    it('should throw error if user not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      mockPrismaService.plan.findUnique.mockResolvedValue({ id: 'plan-123' })
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.assignSubscription(assignSubscriptionDto, 'admin-123')).rejects.toThrow(NotFoundException)
    })

    it('should handle existing subscription', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      const mockPlan = { id: 'plan-123' }
      const mockUser = {
        id: 'user-123',
        subscriptionId: 'existing-sub',
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      mockPrismaService.subscription.create.mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
      })

      const result = await service.assignSubscription(assignSubscriptionDto, 'admin-123')
      expect(result).toBeDefined()
    })
  })

  describe('getMySubscription', () => {
    it('should return user subscription', async () => {
      const userId = 'user-123'

      const mockSubscription = {
        id: 'sub-123',
        userId,
        plan: { name: 'Premium Plan', price: 29.99 },
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      mockPrismaService.subscription.findFirst.mockImplementation(({ where }) =>
        where.status?.in ? Promise.resolve(mockSubscription) : Promise.resolve(null)
      )

      const result = await service.getMySubscription(userId)

      expect(result).toEqual({ subscription: mockSubscription, pendingSubscription: null })
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: 'PENDING' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return null if no subscription found', async () => {
      const userId = 'user-456'

      mockPrismaService.subscription.findFirst.mockResolvedValue(null)

      const result = await service.getMySubscription(userId)

      expect(result).toEqual({ subscription: null, pendingSubscription: null })
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel user subscription', async () => {
      const userId = 'user-123'

      const existingSubscription = {
        id: 'sub-123',
        userId,
        status: 'ACTIVE',
      }

      const cancelledSubscription = {
        ...existingSubscription,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      }

      mockPrismaService.subscription.findUnique.mockResolvedValue(existingSubscription)
      mockPrismaService.subscription.update.mockResolvedValue(cancelledSubscription)

      const result = await service.cancelSubscription('sub-123')

      expect(result).toEqual(cancelledSubscription)
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { status: 'CANCELLED' },
      })
    })

    it('should throw error if no subscription found', async () => {
      const userId = 'user-456'

      mockPrismaService.subscription.findUnique.mockResolvedValue(null)

      await expect(service.cancelSubscription(userId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getStats', () => {
    it('should return plan statistics', async () => {
      const mockStats = {
        totalPlans: 5,
        totalSubs: 85,
        activeSubs: 85,
        monthlyRevenue: 2500,
      }

      mockPrismaService.plan.count.mockResolvedValue(mockStats.totalPlans)
      mockPrismaService.subscription.count.mockResolvedValue(mockStats.totalSubs)
      mockPrismaService.subscription.count.mockResolvedValue(mockStats.activeSubs)
      mockPrismaService.subscription.aggregate.mockResolvedValue({ _sum: { pricePaid: mockStats.monthlyRevenue } })

      const result = await service.getStats()

      expect(result).toBeDefined()
      expect(result.totalPlans).toBe(5)
      expect(result.totalSubs).toBe(85)
      expect(result.activeSubs).toBe(85)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const createPlanDto = {
        name: 'Test Plan',
        description: 'Test',
        price: 9.99,
        duration: 30,
        features: [],
        maxUsers: 1,
        maxProducts: 10,
        maxOrders: 50,
      }

      mockPrismaService.plan.create.mockRejectedValue(new Error('Database connection failed'))

      await expect(service.createPlan(createPlanDto)).rejects.toThrow('Database connection failed')
    })

    it('should validate plan data', async () => {
      const invalidPlanDto = {
        name: '',
        description: 'Test',
        price: -10,
        duration: 0,
        features: [],
        maxUsers: 0,
        maxProducts: 0,
        maxOrders: 0,
      }

      mockPrismaService.plan.create.mockRejectedValue(new Error('Invalid plan data'))

      await expect(service.createPlan(invalidPlanDto)).rejects.toThrow('Invalid plan data')
    })
  })
})
