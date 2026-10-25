import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from '../../domains/money/plans/plans.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RoleResolverService } from '../../common/account-type/role-resolver.service';
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver';
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service';
import { CategoryScopeService } from '../../common/category-scope/category-scope.service';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('PlansService', () => {
  let service: PlansService;
  let prismaService: PrismaService;

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
    userProfile: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
      update: jest.fn(),
    },
    // Transacción interactiva: el callback recibe el mismo mock como `tx`.
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockCommerceResolver = {
    ensureForUser: jest.fn().mockResolvedValue(null),
  };

  const redisStore = new Map<string, string>();
  const mockRedisService = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      redisStore.delete(key);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    redisStore.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        RoleResolverService,
        AccountTypeResolver,
        { provide: CommerceResolverService, useValue: mockCommerceResolver },
        CategoryScopeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlan', () => {
    it('should create a new plan successfully', async () => {
      const createPlanDto = {
        name: 'Premium Plan',
        description: 'Premium features',
        price: 29.99,
        currency: 'USD' as const,
        duration: 30,
        features: ['Feature 1', 'Feature 2'],
        enabledModules: ['module1', 'module2'],
        maxUsers: 10,
        maxProducts: 1000,
        maxOrders: 5000,
      };

      const mockPlan = {
        id: 'plan-123',
        ...createPlanDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.plan.create.mockResolvedValue(mockPlan);

      const result = await service.createPlan(createPlanDto);

      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.plan.create).toHaveBeenCalledWith({
        data: {
          ...createPlanDto,
          features: createPlanDto.features ?? [],
          enabledModules: createPlanDto.enabledModules ?? [],
        },
      });
    });

    it('should throw error for duplicate plan name', async () => {
      const createPlanDto = {
        name: 'Premium Plan',
        description: 'Premium features',
        price: 29.99,
        currency: 'USD' as const,
        duration: 30,
        features: [],
        maxUsers: 10,
        maxProducts: 1000,
        maxOrders: 5000,
      };

      mockPrismaService.plan.create.mockRejectedValue(
        new Error('Plan name already exists')
      );

      await expect(service.createPlan(createPlanDto)).rejects.toThrow(
        'Plan name already exists'
      );
    });
  });

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
      ];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.findAllPlans();

      expect(result).toEqual(mockPlans);
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: {
          _count: { select: { subscriptions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      });
    });

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
      ];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.findAllPlans(true);

      expect(result).toEqual(mockPlans);
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: { select: { subscriptions: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      });
    });
  });

  describe('findPlanById', () => {
    it('should return plan by id', async () => {
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        name: 'Premium Plan',
        price: 29.99,
        status: 'ACTIVE',
        _count: { subscriptions: 10 },
        subscriptions: [],
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findPlanById(planId);

      expect(result).toEqual(mockPlan);
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
      });
    });

    it('should throw error if plan not found', async () => {
      const planId = 'plan-123';

      mockPrismaService.plan.findUnique.mockResolvedValue(null);
    });

    it('should throw error if plan not found', async () => {
      const planId = 'plan-123';

      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.findPlanById(planId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const planId = 'plan-123';
      const updatePlanDto = {
        name: 'Updated Premium Plan',
        price: 39.99,
      };

      const existingPlan = {
        id: planId,
        name: 'Premium Plan',
        price: 29.99,
        currency: 'USD' as const,
      };

      const updatedPlan = {
        ...existingPlan,
        name: 'Updated Premium Plan',
        price: 39.99,
        updatedAt: new Date(),
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan);
      mockPrismaService.plan.update.mockResolvedValue(updatedPlan);

      const result = await service.updatePlan(planId, updatePlanDto);

      expect(result).toEqual(updatedPlan);
    });

    it('should throw error if plan not found', async () => {
      const planId = 'plan-123';
      const updatePlanDto = {
        name: 'Updated Plan',
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.updatePlan(planId, updatePlanDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw error if plan not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.assignSubscription(assignSubscriptionDto, 'admin-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if user not found', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      };

      mockPrismaService.plan.findUnique.mockResolvedValue({ id: 'plan-123' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignSubscription(assignSubscriptionDto, 'admin-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle existing subscription', async () => {
      const assignSubscriptionDto = {
        userId: 'user-123',
        planId: 'plan-123',
        commerceId: 'commerce-123',
      };

      const mockPlan = { id: 'plan-123' };
      const mockUser = {
        id: 'user-123',
        subscriptionId: 'existing-sub',
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      mockPrismaService.subscription.create.mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
      });

      const result = await service.assignSubscription(
        assignSubscriptionDto,
        'admin-123'
      );
      expect(result).toBeDefined();
    });
  });

  describe('selfSubscribe', () => {
    // Este archivo no limpia mocks entre tests (patrón preexistente en toda
    // la suite) — se resetean explícitamente los mocks que este bloque usa
    // para no depender de llamadas acumuladas de tests anteriores.
    beforeEach(() => {
      mockPrismaService.subscription.updateMany.mockReset();
      mockPrismaService.subscription.create.mockReset();
      mockPrismaService.subscription.findFirst.mockReset();
    });

    it('activa un plan gratuito de inmediato (status ACTIVE, sin aprobación)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-free',
        price: 0,
      });
      mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.subscription.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ id: 'sub-1', ...data })
      );

      const result = await service.selfSubscribe('user-123', {
        planId: 'plan-free',
      });

      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE', pricePaid: 0 }),
        })
      );
      expect(result.status).toBe('ACTIVE');
    });

    it('un plan pago queda PENDING — no se activa sin aprobación admin (bug de deposit() sin verificar, corregido)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-pro',
        price: 599,
        currency: 'USD' as const,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.subscription.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ id: 'sub-1', ...data })
      );

      const result = await service.selfSubscribe('user-123', {
        planId: 'plan-pro',
      });

      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING', pricePaid: 599 }),
        })
      );
      // No debe tocar suscripciones existentes hasta que se apruebe — eso lo
      // hace approveSubscription, no selfSubscribe.
      expect(mockPrismaService.subscription.updateMany).not.toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
    });

    it('rechaza una nueva solicitud de plan pago si ya hay una PENDING', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-pro',
        price: 599,
        currency: 'USD' as const,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'existing-pending',
        status: 'PENDING',
      });

      await expect(
        service.selfSubscribe('user-123', { planId: 'plan-pro' })
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el plan no existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.selfSubscribe('user-123', { planId: 'nope' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateTrial', () => {
    beforeEach(() => {
      mockPrismaService.subscription.updateMany.mockReset();
      mockPrismaService.subscription.create.mockReset();
      mockPrismaService.subscription.findFirst.mockReset();
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.update.mockReset();
    });

    it('activa un trial de 7 días y marca trialUsedAt cuando el usuario nunca lo usó', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: null,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-pro',
        price: 599,
        currency: 'USD' as const,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.subscription.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({
            id: 'sub-1',
            ...data,
            plan: { id: 'plan-pro', price: 599 },
          })
      );
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: new Date(),
      });

      const result = await service.activateTrial('user-123', 'plan-pro');

      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'TRIAL',
            pricePaid: 0,
            planId: 'plan-pro',
          }),
        })
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { trialUsedAt: expect.any(Date) },
      });
      // endAt/trialEnds deben ser ~7 días en el futuro (el scheduler expira por endAt).
      const createCall = mockPrismaService.subscription.create.mock.calls[0][0];
      const daysUntilEnd =
        (createCall.data.endAt.getTime() - createCall.data.startAt.getTime()) /
        86_400_000;
      expect(daysUntilEnd).toBeCloseTo(7, 0);
      expect(createCall.data.trialEnds).toEqual(createCall.data.endAt);
      expect(result.status).toBe('TRIAL');
    });

    it('rechaza activar el trial si el usuario ya lo usó antes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: new Date('2026-01-01'),
      });

      await expect(
        service.activateTrial('user-123', 'plan-pro')
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });

    it('rechaza activar el trial de un plan gratuito (no tiene sentido)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: null,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-free',
        price: 0,
      });

      await expect(
        service.activateTrial('user-123', 'plan-free')
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });

    it('rechaza activar el trial si ya tiene un plan pago activo', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: null,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan-pro',
        price: 599,
        currency: 'USD' as const,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'existing-sub',
        status: 'ACTIVE',
        plan: { price: 599 },
      });

      await expect(
        service.activateTrial('user-123', 'plan-pro')
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el plan no existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        trialUsedAt: null,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.activateTrial('user-123', 'nope')).rejects.toThrow(
        NotFoundException
      );
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.activateTrial('nope', 'plan-pro')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('approveSubscription', () => {
    function pendingSubscription(overrides: Partial<any> = {}) {
      return {
        id: 'sub-1',
        userId: 'user-1',
        status: 'PENDING',
        interval: 'MONTHLY',
        plan: { forCommerce: true, forFreelancer: false },
        user: {
          id: 'user-1',
          kycStatus: 'APPROVED',
          categoryId: 'cat-1',
          subcategoryId: null,
        },
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.subscription.findUnique.mockReset();
      mockPrismaService.subscription.update.mockReset();
      mockPrismaService.subscription.updateMany.mockReset();
      mockPrismaService.user.update.mockReset();
      mockPrismaService.userProfile.findFirst
        .mockReset()
        .mockResolvedValue(null);
      mockPrismaService.userProfile.findMany.mockReset().mockResolvedValue([]);
      mockPrismaService.userProfile.count.mockReset().mockResolvedValue(1);
      mockPrismaService.userProfile.create.mockReset();
      mockPrismaService.userProfile.update.mockReset();
      mockPrismaService.subscription.update.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ ...pendingSubscription(), ...data })
      );
    });

    it('bloquea la aprobación si el KYC del usuario no está APPROVED', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        pendingSubscription({ user: { id: 'user-1', kycStatus: 'PENDING' } })
      );

      await expect(
        service.approveSubscription('sub-1', 'admin-1')
      ).rejects.toThrow(
        'debe completar y aprobar la verificación de identidad'
      );
      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled();
    });

    it('un plan forCommerce crea/activa un UserProfile BUSINESS y otorga role PROFESIONAL', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        pendingSubscription()
      );
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'NORMAL' });
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: 'BUSINESS', subtype: null },
      ]);

      await service.approveSubscription('sub-1', 'admin-1');

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'BUSINESS',
            subtype: null,
            status: 'ACTIVE',
          }),
        })
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'PROFESIONAL' },
      });
      // Antes este camino activaba BUSINESS sin crear su Commerce.
      expect(mockCommerceResolver.ensureForUser).toHaveBeenCalledWith(
        mockPrismaService,
        'user-1'
      );
    });

    it('un plan forFreelancer crea/activa un UserProfile PROFESSIONAL/FREELANCER y otorga role PROFESIONAL', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        pendingSubscription({
          plan: { forCommerce: false, forFreelancer: true },
        })
      );
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'NORMAL' });
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: 'PROFESSIONAL', subtype: 'FREELANCER' },
      ]);

      await service.approveSubscription('sub-1', 'admin-1');

      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'PROFESSIONAL',
            subtype: 'FREELANCER',
            status: 'ACTIVE',
          }),
        })
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'PROFESIONAL' },
      });
    });

    it('reutiliza un UserProfile existente del mismo tipo en vez de duplicarlo', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        pendingSubscription()
      );
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'NORMAL' });
      mockPrismaService.userProfile.findFirst.mockResolvedValue({
        id: 'profile-existing',
      });
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: 'BUSINESS', subtype: null },
      ]);

      await service.approveSubscription('sub-1', 'admin-1');

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-existing' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('getMySubscription', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockReset();
    });

    it('should return user subscription and trialAvailable=false when the plan is paid', async () => {
      const userId = 'user-123';

      const mockSubscription = {
        id: 'sub-123',
        userId,
        plan: { name: 'Premium Plan', price: 29.99 },
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.subscription.findFirst.mockImplementation(
        ({ where }) =>
          where.status?.in
            ? Promise.resolve(mockSubscription)
            : Promise.resolve(null)
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        trialUsedAt: null,
      });

      const result = await service.getMySubscription(userId);

      expect(result).toEqual({
        subscription: mockSubscription,
        pendingSubscription: null,
        trialAvailable: false,
      });
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: 'PENDING' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null subscriptions and trialAvailable=true when nothing was found and trial unused', async () => {
      const userId = 'user-456';

      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        trialUsedAt: null,
      });

      const result = await service.getMySubscription(userId);

      expect(result).toEqual({
        subscription: null,
        pendingSubscription: null,
        trialAvailable: true,
      });
    });

    it('should return trialAvailable=false once the user already used the trial', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        trialUsedAt: new Date('2026-01-01'),
      });

      const result = await service.getMySubscription('user-789');

      expect(result.trialAvailable).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel user subscription', async () => {
      const userId = 'user-123';

      const existingSubscription = {
        id: 'sub-123',
        userId,
        status: 'ACTIVE',
      };

      const cancelledSubscription = {
        ...existingSubscription,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(
        existingSubscription
      );
      mockPrismaService.subscription.update.mockResolvedValue(
        cancelledSubscription
      );

      const result = await service.cancelSubscription('sub-123');

      expect(result).toEqual(cancelledSubscription);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should throw error if no subscription found', async () => {
      const userId = 'user-456';

      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription(userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getStats', () => {
    it('should return plan statistics', async () => {
      const mockStats = {
        totalPlans: 5,
        totalSubs: 85,
        activeSubs: 85,
        monthlyRevenue: 2500,
      };

      mockPrismaService.plan.count.mockResolvedValue(mockStats.totalPlans);
      mockPrismaService.subscription.count.mockResolvedValue(
        mockStats.totalSubs
      );
      mockPrismaService.subscription.count.mockResolvedValue(
        mockStats.activeSubs
      );
      mockPrismaService.subscription.aggregate.mockResolvedValue({
        _sum: { pricePaid: mockStats.monthlyRevenue },
      });

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.totalPlans).toBe(5);
      expect(result.totalSubs).toBe(85);
      expect(result.activeSubs).toBe(85);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const createPlanDto = {
        name: 'Test Plan',
        description: 'Test',
        price: 9.99,
        currency: 'USD' as const,
        duration: 30,
        features: [],
        maxUsers: 1,
        maxProducts: 10,
        maxOrders: 50,
      };

      mockPrismaService.plan.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.createPlan(createPlanDto)).rejects.toThrow(
        'Database connection failed'
      );
    });

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
      };

      mockPrismaService.plan.create.mockRejectedValue(
        new Error('Invalid plan data')
      );

      await expect(service.createPlan(invalidPlanDto)).rejects.toThrow(
        'Invalid plan data'
      );
    });
  });

  describe('getPublicPlans', () => {
    function plan(overrides: Partial<any> = {}) {
      return {
        id: 'p1',
        name: 'Pro',
        categoryIds: [],
        forFreelancer: true,
        forCommerce: true,
        forNormal: false,
        ...overrides,
      };
    }

    it('returns a plan with no categoryIds regardless of the categoryId filter (visible to every rubro)', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([
        plan({ categoryIds: [] }),
      ]);

      const result = await service.getPublicPlans(
        undefined,
        undefined,
        'rubro-1'
      );

      expect(result).toHaveLength(1);
    });

    it('keeps a plan whose categoryIds includes the given categoryId', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([
        plan({ categoryIds: ['rubro-1', 'rubro-2'] }),
      ]);

      const result = await service.getPublicPlans(
        undefined,
        undefined,
        'rubro-1'
      );

      expect(result).toHaveLength(1);
    });

    it('drops a plan whose categoryIds does not include the given categoryId (CategoryScopeService.filterByField)', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([
        plan({ categoryIds: ['rubro-2'] }),
      ]);

      const result = await service.getPublicPlans(
        undefined,
        undefined,
        'rubro-1'
      );

      expect(result).toHaveLength(0);
    });

    it('returns all plans unfiltered when no categoryId is given', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([
        plan({ categoryIds: ['rubro-2'] }),
        plan({ categoryIds: [] }),
      ]);

      const result = await service.getPublicPlans();

      expect(result).toHaveLength(2);
    });
  });
});
