import { Test, TestingModule } from '@nestjs/testing'
import { PlansService } from '../../plans/plans.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

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
      update: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<PlansService>(PlansService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new plan successfully', async () => {
      const createPlanDto = {
        name: 'Premium Plan',
        description: 'Premium features',
        price: 29.99,
        duration: 30,
        features: ['Feature 1', 'Feature 2'],
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

      const result = await service.create(createPlanDto)

      expect(result).toEqual(mockPlan)
      expect(mockPrismaService.plan.create).toHaveBeenCalledWith({
        data: createPlanDto,
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

      await expect(service.create(createPlanDto)).rejects.toThrow('Plan name already exists')
    })
  })

  describe('findAll', () => {
    it('should return paginated plans', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        active: true,
      }

      const mockPlans = [
        { id: 'plan-1', name: 'Basic Plan', price: 9.99, active: true },
        { id: 'plan-2', name: 'Premium Plan', price: 29.99, active: true },
      ]

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans)
      mockPrismaService.plan.count.mockResolvedValue(2)

      const result = await service.findAll(queryDto)

      expect(result).toEqual({
        plans: mockPlans,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should filter by active status', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        active: false,
      }

      const mockPlans = [
        { id: 'plan-3', name: 'Old Plan', price: 19.99, active: false },
      ]

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans)
      mockPrismaService.plan.count.mockResolvedValue(1)

      const result = await service.findAll(queryDto)

      expect(result.plans).toHaveLength(1)
      expect(result.plans[0].active).toBe(false)
    })
  })

  describe('findOne', () => {
    it('should return plan by id', async () => {
      const planId = 'plan-123'

      const mockPlan = {
        id: planId,
        name: 'Premium Plan',
        price: 29.99,
        features: ['Feature 1', 'Feature 2'],
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan)

      const result = await service.findOne(planId)

      expect(result).toEqual(mockPlan)
      expect(mockPrismaService.plan.findUnique).toHaveBeenCalledWith({
        where: { id: planId },
      })
    })

    it('should throw error if plan not found', async () => {
      const planId = 'plan-123'

      mockPrismaService.plan.findUnique.mockResolvedValue(null)

      await expect(service.findOne(planId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
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
        ...updatePlanDto,
        updatedAt: new Date(),
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan)
      mockPrismaService.plan.update.mockResolvedValue(updatedPlan)

      const result = await service.update(planId, updatePlanDto)

      expect(result).toEqual(updatedPlan)
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: updatePlanDto,
      })
    })

    it('should throw error if plan not found for update', async () => {
      const planId = 'plan-123'
      const updatePlanDto = { name: 'Updated Plan' }

      mockPrismaService.plan.findUnique.mockResolvedValue(null)

      await expect(service.update(planId, updatePlanDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should deactivate plan successfully', async () => {
      const planId = 'plan-123'

      const existingPlan = {
        id: planId,
        name: 'Premium Plan',
        active: true,
      }

      const deactivatedPlan = {
        ...existingPlan,
        active: false,
        updatedAt: new Date(),
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan)
      mockPrismaService.plan.update.mockResolvedValue(deactivatedPlan)

      const result = await service.remove(planId)

      expect(result).toEqual(deactivatedPlan)
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: { active: false },
      })
    })
  })

  describe('assignSubscription', () => {
    it('should assign subscription to user successfully', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      const mockPlan = {
        id: 'plan-123',
        name: 'Premium Plan',
        price: 29.99,
        duration: 30,
      }

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        subscriptionId: null,
      }

      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.subscription.create.mockResolvedValue(mockSubscription)

      const result = await service.assignSubscription(assignSubscriptionDto)

      expect(result).toEqual(mockSubscription)
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: assignSubscriptionDto.userId,
          planId: assignSubscriptionDto.planId,
          commerceId: assignSubscriptionDto.commerceId,
          status: 'ACTIVE',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
      })
    })

    it('should throw error if plan not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      mockPrismaService.plan.findUnique.mockResolvedValue(null)

      await expect(service.assignSubscription(assignSubscriptionDto)).rejects.toThrow(NotFoundException)
    })

    it('should throw error if user not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      }

      mockPrismaService.plan.findUnique.mockResolvedValue({ id: 'plan-123' })
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.assignSubscription(assignSubscriptionDto)).rejects.toThrow(NotFoundException)
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

      await expect(service.assignSubscription(assignSubscriptionDto)).rejects.toThrow(BadException)
    })
  })

  describe('getUserSubscription', () => {
    it('should return user subscription', async () => {
      const userId = 'user-123'

      const mockSubscription = {
        id: 'sub-123',
        userId,
        plan: { name: 'Premium Plan', price: 29.99 },
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription)

      const result = await service.getUserSubscription(userId)

      expect(result).toEqual(mockSubscription)
      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: { plan: true },
      })
    })

    it('should return null if no subscription found', async () => {
      const userId = 'user-456'

      mockPrismaService.subscription.findUnique.mockResolvedValue(null)

      const result = await service.getUserSubscription(userId)

      expect(result).toBeNull()
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

      const result = await service.cancelSubscription(userId)

      expect(result).toEqual(cancelledSubscription)
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
        },
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
        activePlans: 3,
        totalSubscriptions: 100,
        activeSubscriptions: 85,
        monthlyRevenue: 2500,
      }

      mockPrismaService.plan.count.mockResolvedValue(mockStats.totalPlans)
      mockPrismaService.plan.count.mockResolvedValue(mockStats.activePlans)
      mockPrismaService.subscription.count.mockResolvedValue(mockStats.totalSubscriptions)
      mockPrismaService.subscription.count.mockResolvedValue(mockStats.activeSubscriptions)

      const result = await service.getStats()

      expect(result).toBeDefined()
      expect(result.totalPlans).toBe(5)
      expect(result.activePlans).toBe(3)
      expect(result.totalSubscriptions).toBe(100)
      expect(result.activeSubscriptions).toBe(85)
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

      await expect(service.create(createPlanDto)).rejects.toThrow('Database connection failed')
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

      await expect(service.create(invalidPlanDto)).rejects.toThrow('Invalid plan data')
    })
  })
})
