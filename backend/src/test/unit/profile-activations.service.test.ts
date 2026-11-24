import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingInterval,
  Prisma,
  ProfessionalSubtype,
  ProfileStatus,
  ProfileType,
  Role,
} from '@prisma/client';
import { ProfileActivationsService } from '../../domains/identity-access/profile-activations/profile-activations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { RoleResolverService } from '../../common/account-type/role-resolver.service';
import { PLANS_FACADE } from '../../domains/money/plans/plans.facade';
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service';

describe('ProfileActivationsService', () => {
  let service: ProfileActivationsService;
  let mockPrismaService: any;
  let mockPlansService: any;
  let mockCommerceResolver: { ensureForUser: jest.Mock };

  const USER_ID = 'user-1';
  const ADMIN_ID = 'admin-1';
  const PROFILE_ID = 'profile-1';
  const CATEGORY_ID = 'cat-1';
  const PLAN_ID = 'plan-1';

  function pendingProfile(overrides: Partial<any> = {}) {
    return {
      id: PROFILE_ID,
      userId: USER_ID,
      type: ProfileType.PROFESSIONAL,
      subtype: ProfessionalSubtype.FREELANCER,
      categoryId: CATEGORY_ID,
      subcategoryId: null,
      status: ProfileStatus.PENDING,
      user: { kycStatus: 'APPROVED' },
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }),
      },
      userCategory: { findUnique: jest.fn() },
      userSubcategory: { findUnique: jest.fn() },
      plan: { findUnique: jest.fn() },
      userProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ ...pendingProfile(), ...data })
          ),
        // review() reclama la solicitud solo si sigue PENDING.
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockImplementation(() => Promise.resolve(pendingProfile())),
      },
      commerce: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'commerce-1' }),
      },
      serviceRequest: { count: jest.fn().mockResolvedValue(0) },
      catalogOrder: { count: jest.fn().mockResolvedValue(0) },
      // Transacción interactiva: el callback recibe el mismo mock como `tx`
      // (suficiente para estos tests — no hay aislamiento real de Prisma).
      $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
    };

    const mockRedisService = { del: jest.fn() };
    const mockNotificationsService = {
      notifyProfileActivationReviewed: jest.fn().mockResolvedValue(undefined),
    };
    mockPlansService = {
      activateSubscriptionForPlan: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    };
    mockCommerceResolver = { ensureForUser: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileActivationsService,
        RoleResolverService,
        { provide: CommerceResolverService, useValue: mockCommerceResolver },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PLANS_FACADE, useValue: mockPlansService },
      ],
    }).compile();

    service = module.get<ProfileActivationsService>(ProfileActivationsService);
  });

  describe('create', () => {
    it('rechaza si ya tiene este tipo de perfil PENDING o ACTIVE', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(
        pendingProfile()
      );

      await expect(
        service.create(USER_ID, { type: ProfileType.PROFESSIONAL } as any)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(
      'convierte una colisión concurrente del índice único en ConflictException',
      async () => {
        mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
        mockPrismaService.userProfile.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            { code: 'P2002', clientVersion: 'test' }
          )
        );

        await expect(
          service.create(USER_ID, {
            type: ProfileType.PROFESSIONAL,
            subtype: ProfessionalSubtype.FREELANCER,
          } as any)
        ).rejects.toBeInstanceOf(ConflictException);
      }
    );

    it(
      'hace idempotente la creación concurrente del perfil CUSTOMER',
      async () => {
        const existingCustomer = {
          id: 'customer-created-by-concurrent-request',
          userId: USER_ID,
          type: ProfileType.CUSTOMER,
          status: ProfileStatus.ACTIVE,
        };
        mockPrismaService.userProfile.findFirst
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingCustomer);
        mockPrismaService.userProfile.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            { code: 'P2002', clientVersion: 'test' }
          )
        );

        await expect(service.ensureCustomerProfile(USER_ID)).resolves.toEqual(
          existingCustomer
        );
      }
    );

    it('activa CUSTOMER de inmediato, sin quedar PENDING', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );

      const result = await service.create(USER_ID, {
        type: ProfileType.CUSTOMER,
      } as any);

      expect(result.status).toBe(ProfileStatus.ACTIVE);
    });

    it('deja PROFESSIONAL en PENDING, requiere aprobación', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );

      const result = await service.create(USER_ID, {
        type: ProfileType.PROFESSIONAL,
        subtype: ProfessionalSubtype.FREELANCER,
      } as any);

      expect(result.status).toBe(ProfileStatus.PENDING);
    });

    it('guarda pendingCommerceName al solicitar BUSINESS', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );
      mockPrismaService.userCategory.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
      });

      const result = await service.create(USER_ID, {
        type: ProfileType.BUSINESS,
        categoryId: CATEGORY_ID,
        commerceName: 'Panadería El Trigal',
      } as any);

      expect(result.pendingCommerceName).toBe('Panadería El Trigal');
      expect(result.status).toBe(ProfileStatus.PENDING);
    });

    it('no guarda pendingCommerceName para tipos que no son BUSINESS', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );
      mockPrismaService.userCategory.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
      });

      const result = await service.create(USER_ID, {
        type: ProfileType.PROFESSIONAL,
        subtype: ProfessionalSubtype.FREELANCER,
        categoryId: CATEGORY_ID,
        commerceName: 'esto no debería guardarse',
      } as any);

      expect(result.pendingCommerceName).toBeUndefined();
    });

    it('rechaza planId si el tipo no requiere aprobación (JOB_SEEKER)', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, {
          type: ProfileType.JOB_SEEKER,
          planId: PLAN_ID,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un plan inexistente', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userCategory.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: CATEGORY_ID,
          planId: PLAN_ID,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un plan forCommerce=true para un perfil PROFESSIONAL (incompatible)', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userCategory.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: PLAN_ID,
        forCommerce: true,
        forFreelancer: false,
      });

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: CATEGORY_ID,
          planId: PLAN_ID,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda pendingPlanId y pendingPlanInterval cuando el plan es compatible', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );
      mockPrismaService.userCategory.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: PLAN_ID,
        forCommerce: false,
        forFreelancer: true,
      });

      const result = await service.create(USER_ID, {
        type: ProfileType.PROFESSIONAL,
        subtype: ProfessionalSubtype.FREELANCER,
        categoryId: CATEGORY_ID,
        planId: PLAN_ID,
        planInterval: BillingInterval.ANNUAL,
      } as any);

      expect(result.pendingPlanId).toBe(PLAN_ID);
      expect(result.pendingPlanInterval).toBe(BillingInterval.ANNUAL);
    });

    it('rechaza solicitar BUSINESS si ya tiene PROFESSIONAL activo (exclusión mutua)', async () => {
      mockPrismaService.userProfile.findFirst
        .mockResolvedValueOnce(null) // sin duplicado del mismo tipo (BUSINESS)
        .mockResolvedValueOnce(
          pendingProfile({
            type: ProfileType.PROFESSIONAL,
            status: ProfileStatus.ACTIVE,
          })
        ); // conflicto cruzado

      await expect(
        service.create(USER_ID, {
          type: ProfileType.BUSINESS,
          categoryId: CATEGORY_ID,
          commerceName: 'Mi Negocio',
        } as any)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza solicitar PROFESSIONAL si ya tiene BUSINESS pendiente (exclusión mutua)', async () => {
      mockPrismaService.userProfile.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          pendingProfile({
            type: ProfileType.BUSINESS,
            status: ProfileStatus.PENDING,
          })
        );

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: CATEGORY_ID,
        } as any)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('la exclusión mutua no aplica a CUSTOMER/JOB_SEEKER', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data)
      );

      const result = await service.create(USER_ID, {
        type: ProfileType.CUSTOMER,
      } as any);

      expect(result.status).toBe(ProfileStatus.ACTIVE);
      // Solo 1 findFirst (chequeo de duplicado propio) — CUSTOMER no dispara
      // el segundo chequeo cruzado.
      expect(mockPrismaService.userProfile.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('review', () => {
    it('un admin no puede revisar su propia solicitud de perfil', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ userId: ADMIN_ID })
      );

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.ACTIVE,
        } as any)
      ).rejects.toThrow('No puedes revisar tu propia solicitud');
      expect(mockPrismaService.userProfile.updateMany).not.toHaveBeenCalled();
    });

    it('si otro admin la revisó en paralelo, no aprueba dos veces', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile()
      );
      mockPrismaService.userProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.ACTIVE,
        } as any)
      ).rejects.toThrow('revisada por otro administrador');
      expect(mockCommerceResolver.ensureForUser).not.toHaveBeenCalled();
      expect(
        mockPlansService.activateSubscriptionForPlan
      ).not.toHaveBeenCalled();
    });

    it('bloquea la activación si el KYC del solicitante no está APPROVED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ user: { kycStatus: 'PENDING' } })
      );

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.ACTIVE,
        } as any)
      ).rejects.toThrow('debe tener su identidad verificada');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('permite rechazar aunque el KYC no esté aprobado', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ user: { kycStatus: 'NONE' } })
      );

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.REJECTED,
          rejectionReason: 'No aplica',
        } as any)
      ).resolves.toBeDefined();
    });

    it('al activar un perfil PROFESSIONAL/FREELANCER con KYC aprobado, otorga el rol PROFESIONAL real', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile()
      );
      // syncRoleForUser relee los ACTIVE profiles dentro de la transacción —
      // simula que el update de arriba ya dejó este perfil como ACTIVE.
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
        },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      });
    });

    it('otorga rol PROFESIONAL también para un perfil PROFESSIONAL/SERVICE_PROVIDER', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ subtype: ProfessionalSubtype.SERVICE_PROVIDER })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.SERVICE_PROVIDER,
        },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      });
    });

    it('otorga rol PROFESIONAL para un perfil BUSINESS activado', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          subtype: null,
          categoryId: null,
        })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      });
    });

    // La regla "¿este perfil debe tener Commerce?" (BUSINESS siempre;
    // PROFESSIONAL si su categoría vende producto), el nombre y la
    // idempotencia viven en CommerceResolverService.ensureForUser — ver
    // commerce-resolver.service.test.ts. Acá solo se verifica que la
    // aprobación delega en ese punto único, dentro de la transacción.
    it('delega en ensureForUser (dentro de la tx) al activar un perfil BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          subtype: null,
          categoryId: null,
          pendingCommerceName: 'Panadería El Trigal',
        })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockCommerceResolver.ensureForUser).toHaveBeenCalledWith(
        mockPrismaService,
        USER_ID
      );
    });

    it('también delega al activar un perfil PROFESSIONAL (opción 2: puede vender producto según su categoría)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile()
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
        },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockCommerceResolver.ensureForUser).toHaveBeenCalledWith(
        mockPrismaService,
        USER_ID
      );
    });

    it('no intenta crear un Commerce al rechazar un perfil BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          subtype: null,
          categoryId: null,
        })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]);
      mockPrismaService.userProfile.count.mockResolvedValue(0);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.REJECTED,
        rejectionReason: 'No aplica',
      } as any);

      expect(mockCommerceResolver.ensureForUser).not.toHaveBeenCalled();
      expect(mockPrismaService.commerce.create).not.toHaveBeenCalled();
    });

    it('NO otorga ningún rol al rechazar una solicitud PROFESSIONAL/FREELANCER', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile()
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]); // nada quedó ACTIVE
      mockPrismaService.userProfile.count.mockResolvedValue(0); // nunca tuvo perfiles de negocio

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.REJECTED,
        rejectionReason: 'No aplica',
      } as any);

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('activa la Subscription del pendingPlanId al aprobar', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          pendingPlanId: PLAN_ID,
          pendingPlanInterval: BillingInterval.ANNUAL,
        })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
        },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(mockPlansService.activateSubscriptionForPlan).toHaveBeenCalledWith(
        mockPrismaService,
        USER_ID,
        PLAN_ID,
        BillingInterval.ANNUAL,
        ADMIN_ID
      );
    });

    it('no activa ninguna Subscription si la solicitud no tenía pendingPlanId', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ pendingPlanId: null })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
        },
      ]);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.ACTIVE,
      } as any);

      expect(
        mockPlansService.activateSubscriptionForPlan
      ).not.toHaveBeenCalled();
    });

    it('no activa ninguna Subscription al rechazar, aunque haya pendingPlanId', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ pendingPlanId: PLAN_ID })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]);
      mockPrismaService.userProfile.count.mockResolvedValue(0);

      await service.review(PROFILE_ID, ADMIN_ID, {
        status: ProfileStatus.REJECTED,
        rejectionReason: 'No aplica',
      } as any);

      expect(
        mockPlansService.activateSubscriptionForPlan
      ).not.toHaveBeenCalled();
    });

    it('rechaza revisar una solicitud que ya no está PENDING', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE })
      );

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.ACTIVE,
        } as any)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, {
          status: ProfileStatus.ACTIVE,
        } as any)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('fija User.activeProfileId cuando el perfil es propio y está ACTIVE', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE })
      );

      const result = await service.setActive(USER_ID, PROFILE_ID);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { activeProfileId: PROFILE_ID },
      });
      expect(result.id).toBe(PROFILE_ID);
    });

    it('lanza NotFoundException si el perfil no existe', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.setActive(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el perfil pertenece a otro usuario (no filtra por accidente)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, userId: 'other-user' })
      );

      await expect(
        service.setActive(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('rechaza activar un perfil que todavía está PENDING', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.PENDING })
      );

      await expect(
        service.setActive(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('rechaza activar un perfil REJECTED o SUSPENDED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.REJECTED })
      );

      await expect(
        service.setActive(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('pasa un perfil ACTIVE a SUSPENDED con suspendedBySelf=true', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]); // nada queda ACTIVE tras suspender

      const result = await service.deactivate(USER_ID, PROFILE_ID, {
        reason: 'NOT_USING',
      });

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: {
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: true,
          deactivationReason: 'NOT_USING',
          deactivationNote: null,
          deactivatedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe(ProfileStatus.SUSPENDED);
    });

    it('limpia activeProfileId si era el perfil activo de contexto', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]);

      await service.deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' });

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: USER_ID, activeProfileId: PROFILE_ID },
        data: { activeProfileId: null },
      });
    });

    it('recalcula el rol si el tipo es PROFESSIONAL/BUSINESS', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.PROFESSIONAL,
          status: ProfileStatus.ACTIVE,
        })
      );
      mockPrismaService.userProfile.findMany.mockResolvedValue([]); // sin perfiles ACTIVE restantes -> vuelve a NORMAL
      mockPrismaService.userProfile.count.mockResolvedValue(1); // sí tuvo un UserProfile de negocio -> degrada a NORMAL

      await service.deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.NORMAL },
      });
    });

    it('rechaza desactivar un perfil que no está ACTIVE', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.PENDING })
      );

      await expect(
        service.deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFoundException si el perfil pertenece a otro usuario', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, userId: 'other-user' })
      );

      await expect(
        service.deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('el perfil Cliente nunca se desactiva', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.CUSTOMER,
          status: ProfileStatus.ACTIVE,
        })
      );

      await expect(
        service.deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrismaService.userProfile.update).not.toHaveBeenCalled();
    });

    it('"Otro motivo" exige explicarlo y guarda la nota', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE })
      );

      await expect(
        service.deactivate(USER_ID, PROFILE_ID, { reason: 'OTHER', note: '  ' })
      ).rejects.toBeInstanceOf(BadRequestException);

      await service.deactivate(USER_ID, PROFILE_ID, {
        reason: 'OTHER',
        note: '  Me mudo de país  ',
      });
      expect(
        mockPrismaService.userProfile.update.mock.calls[0][0].data
      ).toMatchObject({
        deactivationReason: 'OTHER',
        deactivationNote: 'Me mudo de país',
      });
    });

    it('no deja desactivar Profesional/Negocio con trabajo de clientes en curso', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          status: ProfileStatus.ACTIVE,
        })
      );
      mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrismaService.serviceRequest.count.mockResolvedValue(2);
      mockPrismaService.catalogOrder.count.mockResolvedValue(1);

      const err = await service
        .deactivate(USER_ID, PROFILE_ID, { reason: 'NOT_USING' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().blockers).toEqual([
        expect.stringContaining('2 solicitud(es) de servicio en curso'),
        expect.stringContaining('1 pedido(s) del catálogo sin cerrar'),
      ]);
      expect(mockPrismaService.userProfile.update).not.toHaveBeenCalled();
    });

    it('deactivationBlockers anticipa lo que impide desactivar (vacío = se puede)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.PROFESSIONAL,
          status: ProfileStatus.ACTIVE,
        })
      );
      await expect(
        service.deactivationBlockers(USER_ID, PROFILE_ID)
      ).resolves.toEqual([]);
    });
  });

  describe('perfil Cliente siempre activo', () => {
    it('getMine crea el perfil Cliente si falta', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null);
      await service.getMine(USER_ID);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: ProfileType.CUSTOMER,
          status: ProfileStatus.ACTIVE,
        },
      });
    });

    it('getMine no lo duplica si ya existe', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue({
        id: 'cust',
        type: ProfileType.CUSTOMER,
      });
      await service.getMine(USER_ID);
      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled();
    });

    it('solicitar Cliente devuelve el existente en vez de dar conflicto', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue({
        id: 'cust',
        type: ProfileType.CUSTOMER,
        status: ProfileStatus.ACTIVE,
      });
      await expect(
        service.create(USER_ID, { type: ProfileType.CUSTOMER } as any)
      ).resolves.toMatchObject({ id: 'cust' });
    });
  });

  describe('reactivate', () => {
    it('reactiva un perfil SUSPENDED por el propio usuario, sin volver a pedir aprobación', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: true,
        })
      );
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null); // sin conflicto cruzado
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
        },
      ]);

      const result = await service.reactivate(USER_ID, PROFILE_ID);

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: {
          status: ProfileStatus.ACTIVE,
          suspendedBySelf: false,
          deactivationReason: null,
          deactivationNote: null,
          deactivatedAt: null,
        },
      });
      expect(result.status).toBe(ProfileStatus.ACTIVE);
    });

    it('rechaza reactivar un perfil suspendido por un admin (suspendedBySelf=false)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: false,
        })
      );

      await expect(
        service.reactivate(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.userProfile.update).not.toHaveBeenCalled();
    });

    it('rechaza reactivar si el tipo opuesto (BUSINESS/PROFESSIONAL) ya está activo', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.PROFESSIONAL,
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: true,
        })
      );
      mockPrismaService.userProfile.findFirst.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          status: ProfileStatus.ACTIVE,
        })
      );

      await expect(
        service.reactivate(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza reactivar un perfil que no está SUSPENDED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, suspendedBySelf: true })
      );

      await expect(
        service.reactivate(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFoundException si el perfil pertenece a otro usuario', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: true,
          userId: 'other-user',
        })
      );

      await expect(
        service.reactivate(USER_ID, PROFILE_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
