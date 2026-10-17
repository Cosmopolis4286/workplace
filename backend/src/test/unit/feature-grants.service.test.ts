import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { FeatureGrantsService } from '../../domains/money/feature-grants/feature-grants.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FeatureGrantSource,
  FeatureGrantStatus,
  FeatureUsageMode,
} from '@prisma/client';

describe('FeatureGrantsService', () => {
  let service: FeatureGrantsService;

  const mockPrismaService = {
    plan: { findUnique: jest.fn() },
    planFeatureRule: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscription: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    featureGrant: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureGrantsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FeatureGrantsService>(FeatureGrantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasFeature', () => {
    it('returns false when there is no ACTIVE grant', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue(null);

      expect(await service.hasFeature('user-1', 'business_shield')).toBe(false);
    });

    it('returns true for a grant with no expiration and no usage limit', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        usesRemaining: null,
      });

      expect(await service.hasFeature('user-1', 'business_shield')).toBe(true);
    });

    it('lazily expires a grant whose expiresAt already passed and returns false', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: new Date('2020-01-01'),
        usageMode: FeatureUsageMode.SINGLE_USE,
        usesRemaining: null,
      });

      const result = await service.hasFeature('user-1', 'business_shield');

      expect(result).toBe(false);
      expect(mockPrismaService.featureGrant.update).toHaveBeenCalledWith({
        where: { id: 'grant-1' },
        data: { status: FeatureGrantStatus.EXPIRED },
      });
    });

    it('lazily exhausts a MULTI_USE grant with zero uses remaining and returns false', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.MULTI_USE,
        usesRemaining: 0,
      });

      const result = await service.hasFeature('user-1', 'ai_credits_10');

      expect(result).toBe(false);
      expect(mockPrismaService.featureGrant.update).toHaveBeenCalledWith({
        where: { id: 'grant-1' },
        data: { status: FeatureGrantStatus.EXHAUSTED },
      });
    });

    it('returns true for a MULTI_USE grant that still has uses left', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.MULTI_USE,
        usesRemaining: 3,
      });

      expect(await service.hasFeature('user-1', 'ai_credits_10')).toBe(true);
    });
  });

  describe('consumeUsage', () => {
    it('decrements usesRemaining on a MULTI_USE grant', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.MULTI_USE,
        usesRemaining: 3,
      });

      const result = await service.consumeUsage('user-1', 'ai_credits_10');

      expect(result).toBe(true);
      expect(mockPrismaService.featureGrant.update).toHaveBeenCalledWith({
        where: { id: 'grant-1' },
        data: { usesRemaining: 2, status: FeatureGrantStatus.ACTIVE },
      });
    });

    it('marks the grant EXHAUSTED when the last use is consumed', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.MULTI_USE,
        usesRemaining: 1,
      });

      await service.consumeUsage('user-1', 'ai_credits_10');

      expect(mockPrismaService.featureGrant.update).toHaveBeenCalledWith({
        where: { id: 'grant-1' },
        data: { usesRemaining: 0, status: FeatureGrantStatus.EXHAUSTED },
      });
    });

    it('is a no-op for SINGLE_USE/REACTIVATABLE grants (no usage counter)', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        usesRemaining: null,
      });

      const result = await service.consumeUsage('user-1', 'business_shield');

      expect(result).toBe(true);
      expect(mockPrismaService.featureGrant.update).not.toHaveBeenCalled();
    });

    it('returns false when there is nothing active to consume', async () => {
      mockPrismaService.featureGrant.findFirst.mockResolvedValue(null);

      expect(await service.consumeUsage('user-1', 'ai_credits_10')).toBe(false);
    });
  });

  describe('activateSelfService', () => {
    it('throws NotFoundException when the user has no active subscription', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.activateSelfService('user-1', 'business_shield')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the plan has no rule for that feature', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        planId: 'plan-pro',
        plan: { id: 'plan-pro' },
      });
      mockPrismaService.planFeatureRule.findFirst.mockResolvedValue(null);

      await expect(
        service.activateSelfService('user-1', 'business_shield')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when a grant is already active', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        planId: 'plan-pro',
        plan: { id: 'plan-pro' },
      });
      mockPrismaService.planFeatureRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        featureKey: 'business_shield',
        durationDays: 3,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        maxUses: null,
      });
      mockPrismaService.featureGrant.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'ACTIVE',
        expiresAt: null,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        usesRemaining: null,
      });

      await expect(
        service.activateSelfService('user-1', 'business_shield')
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.featureGrant.create).not.toHaveBeenCalled();
    });

    it('creates a grant with expiresAt = activatedAt + durationDays', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        planId: 'plan-pro',
        plan: { id: 'plan-pro' },
      });
      mockPrismaService.planFeatureRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        featureKey: 'business_shield',
        durationDays: 3,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        maxUses: null,
      });
      mockPrismaService.featureGrant.findFirst.mockResolvedValueOnce(null); // getActiveGrant: nada activo
      mockPrismaService.featureGrant.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ id: 'grant-1', ...data })
      );

      await service.activateSelfService('user-1', 'business_shield');

      const call = mockPrismaService.featureGrant.create.mock.calls[0][0];
      const daysUntilExpiry =
        (call.data.expiresAt.getTime() - call.data.activatedAt.getTime()) /
        86_400_000;
      expect(daysUntilExpiry).toBeCloseTo(3, 0);
      expect(call.data.source).toBe(FeatureGrantSource.SELF_SERVICE);
      expect(call.data.ruleId).toBe('rule-1');
    });

    it('rejects reactivating a SINGLE_USE feature that was ever used before, even if expired', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        planId: 'plan-pro',
        plan: { id: 'plan-pro' },
      });
      mockPrismaService.planFeatureRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        featureKey: 'onboarding_boost',
        durationDays: 7,
        usageMode: FeatureUsageMode.SINGLE_USE,
        maxUses: null,
      });
      mockPrismaService.featureGrant.findFirst
        .mockResolvedValueOnce(null) // getActiveGrant: nada activo ahora
        .mockResolvedValueOnce({ id: 'old-grant', status: 'EXPIRED' }); // pero sí existió antes

      await expect(
        service.activateSelfService('user-1', 'onboarding_boost')
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.featureGrant.create).not.toHaveBeenCalled();
    });

    it('allows reactivating a REACTIVATABLE feature after it expired', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        planId: 'plan-pro',
        plan: { id: 'plan-pro' },
      });
      mockPrismaService.planFeatureRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        featureKey: 'business_shield',
        durationDays: 3,
        usageMode: FeatureUsageMode.REACTIVATABLE,
        maxUses: null,
      });
      // getActiveGrant consulta solo status=ACTIVE — un histórico EXPIRED nunca vuelve acá.
      mockPrismaService.featureGrant.findFirst.mockResolvedValue(null);
      mockPrismaService.featureGrant.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ id: 'grant-2', ...data })
      );

      const result = await service.activateSelfService(
        'user-1',
        'business_shield'
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.featureGrant.create).toHaveBeenCalled();
    });
  });

  describe('grantByAdmin', () => {
    it('throws NotFoundException when the target user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.grantByAdmin('admin-1', {
          userId: 'ghost',
          featureKey: 'business_shield',
          durationDays: 3,
          usageMode: FeatureUsageMode.SINGLE_USE,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a grant with source=ADMIN and grantedBy set, bypassing any plan rule', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.featureGrant.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ id: 'grant-1', ...data })
      );

      const result = await service.grantByAdmin('admin-1', {
        userId: 'user-1',
        featureKey: 'priority_support',
        durationDays: 30,
        usageMode: FeatureUsageMode.MULTI_USE,
        maxUses: 5,
      });

      expect(mockPrismaService.featureGrant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: FeatureGrantSource.ADMIN,
            grantedBy: 'admin-1',
            usesRemaining: 5,
          }),
        })
      );
      expect(result.ruleId).toBeUndefined();
    });
  });

  describe('createRule', () => {
    it('throws ConflictException when a rule for the same plan+featureKey already exists', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue({ id: 'plan-pro' });
      mockPrismaService.planFeatureRule.findUnique.mockResolvedValue({
        id: 'existing-rule',
      });

      await expect(
        service.createRule('plan-pro', {
          featureKey: 'business_shield',
          durationDays: 3,
          usageMode: FeatureUsageMode.REACTIVATABLE,
        })
      ).rejects.toThrow(ConflictException);
    });
  });
});
