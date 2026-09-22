import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { BillingInterval, ProfessionalSubtype, ProfileStatus, ProfileType, Role } from '@prisma/client'
import { ProfileActivationsService } from '../../domains/identity-access/profile-activations/profile-activations.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { RoleResolverService } from '../../common/account-type/role-resolver.service'
import { PlansService } from '../../domains/money/plans/plans.service'

describe('ProfileActivationsService', () => {
  let service: ProfileActivationsService
  let mockPrismaService: any
  let mockPlansService: any

  const USER_ID = 'user-1'
  const ADMIN_ID = 'admin-1'
  const PROFILE_ID = 'profile-1'
  const CATEGORY_ID = 'cat-1'
  const PLAN_ID = 'plan-1'

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
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      user: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }) },
      userCategory: { findUnique: jest.fn() },
      userSubcategory: { findUnique: jest.fn() },
      plan: { findUnique: jest.fn() },
      userProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...pendingProfile(), ...data })),
      },
      commerce: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'commerce-1' }),
      },
      // Transacción interactiva: el callback recibe el mismo mock como `tx`
      // (suficiente para estos tests — no hay aislamiento real de Prisma).
      $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
    }

    const mockRedisService = { del: jest.fn() }
    const mockNotificationsService = { notifyProfileActivationReviewed: jest.fn().mockResolvedValue(undefined) }
    mockPlansService = { activateSubscriptionForPlan: jest.fn().mockResolvedValue({ id: 'sub-1' }) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileActivationsService,
        RoleResolverService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PlansService, useValue: mockPlansService },
      ],
    }).compile()

    service = module.get<ProfileActivationsService>(ProfileActivationsService)
  })

  describe('create', () => {
    it('rechaza si ya tiene este tipo de perfil PENDING o ACTIVE', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(pendingProfile())

      await expect(
        service.create(USER_ID, { type: ProfileType.PROFESSIONAL } as any),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('activa CUSTOMER de inmediato, sin quedar PENDING', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))

      const result = await service.create(USER_ID, { type: ProfileType.CUSTOMER } as any)

      expect(result.status).toBe(ProfileStatus.ACTIVE)
    })

    it('deja PROFESSIONAL en PENDING, requiere aprobación', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))

      const result = await service.create(USER_ID, { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER } as any)

      expect(result.status).toBe(ProfileStatus.PENDING)
    })

    it('guarda pendingCommerceName al solicitar BUSINESS', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })

      const result = await service.create(USER_ID, {
        type: ProfileType.BUSINESS,
        categoryId: CATEGORY_ID,
        commerceName: 'Panadería El Trigal',
      } as any)

      expect(result.pendingCommerceName).toBe('Panadería El Trigal')
      expect(result.status).toBe(ProfileStatus.PENDING)
    })

    it('no guarda pendingCommerceName para tipos que no son BUSINESS', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })

      const result = await service.create(USER_ID, {
        type: ProfileType.PROFESSIONAL,
        subtype: ProfessionalSubtype.FREELANCER,
        categoryId: CATEGORY_ID,
        commerceName: 'esto no debería guardarse',
      } as any)

      expect(result.pendingCommerceName).toBeUndefined()
    })

    it('rechaza planId si el tipo no requiere aprobación (CUSTOMER/JOB_SEEKER)', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)

      await expect(
        service.create(USER_ID, { type: ProfileType.CUSTOMER, planId: PLAN_ID } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rechaza un plan inexistente', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })
      mockPrismaService.plan.findUnique.mockResolvedValue(null)

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: CATEGORY_ID,
          planId: PLAN_ID,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rechaza un plan forCommerce=true para un perfil PROFESSIONAL (incompatible)', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })
      mockPrismaService.plan.findUnique.mockResolvedValue({ id: PLAN_ID, forCommerce: true, forFreelancer: false })

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL,
          subtype: ProfessionalSubtype.FREELANCER,
          categoryId: CATEGORY_ID,
          planId: PLAN_ID,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('guarda pendingPlanId y pendingPlanInterval cuando el plan es compatible', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })
      mockPrismaService.plan.findUnique.mockResolvedValue({ id: PLAN_ID, forCommerce: false, forFreelancer: true })

      const result = await service.create(USER_ID, {
        type: ProfileType.PROFESSIONAL,
        subtype: ProfessionalSubtype.FREELANCER,
        categoryId: CATEGORY_ID,
        planId: PLAN_ID,
        planInterval: BillingInterval.ANNUAL,
      } as any)

      expect(result.pendingPlanId).toBe(PLAN_ID)
      expect(result.pendingPlanInterval).toBe(BillingInterval.ANNUAL)
    })

    it('rechaza solicitar BUSINESS si ya tiene PROFESSIONAL activo (exclusión mutua)', async () => {
      mockPrismaService.userProfile.findFirst
        .mockResolvedValueOnce(null) // sin duplicado del mismo tipo (BUSINESS)
        .mockResolvedValueOnce(pendingProfile({ type: ProfileType.PROFESSIONAL, status: ProfileStatus.ACTIVE })) // conflicto cruzado

      await expect(
        service.create(USER_ID, { type: ProfileType.BUSINESS, categoryId: CATEGORY_ID, commerceName: 'Mi Negocio' } as any),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('rechaza solicitar PROFESSIONAL si ya tiene BUSINESS pendiente (exclusión mutua)', async () => {
      mockPrismaService.userProfile.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pendingProfile({ type: ProfileType.BUSINESS, status: ProfileStatus.PENDING }))

      await expect(
        service.create(USER_ID, {
          type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER, categoryId: CATEGORY_ID,
        } as any),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('la exclusión mutua no aplica a CUSTOMER/JOB_SEEKER', async () => {
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      mockPrismaService.userProfile.create.mockImplementation(({ data }: any) => Promise.resolve(data))

      const result = await service.create(USER_ID, { type: ProfileType.CUSTOMER } as any)

      expect(result.status).toBe(ProfileStatus.ACTIVE)
      // Solo 1 findFirst (chequeo de duplicado propio) — CUSTOMER no dispara
      // el segundo chequeo cruzado.
      expect(mockPrismaService.userProfile.findFirst).toHaveBeenCalledTimes(1)
    })
  })

  describe('review', () => {
    it('bloquea la activación si el KYC del solicitante no está APPROVED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ user: { kycStatus: 'PENDING' } }),
      )

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any),
      ).rejects.toThrow('debe tener su identidad verificada')
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('permite rechazar aunque el KYC no esté aprobado', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ user: { kycStatus: 'NONE' } }),
      )

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.REJECTED, rejectionReason: 'No aplica' } as any),
      ).resolves.toBeDefined()
    })

    it('al activar un perfil PROFESSIONAL/FREELANCER con KYC aprobado, otorga el rol PROFESIONAL real', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile())
      // syncRoleForUser relee los ACTIVE profiles dentro de la transacción —
      // simula que el update de arriba ya dejó este perfil como ACTIVE.
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      })
    })

    it('otorga rol PROFESIONAL también para un perfil PROFESSIONAL/SERVICE_PROVIDER', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ subtype: ProfessionalSubtype.SERVICE_PROVIDER }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.SERVICE_PROVIDER },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      })
    })

    it('otorga rol PROFESIONAL para un perfil BUSINESS activado', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, subtype: null, categoryId: null }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      })
    })

    it('crea un Commerce real con el pendingCommerceName al activar un perfil BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({
          type: ProfileType.BUSINESS,
          subtype: null,
          categoryId: null,
          pendingCommerceName: 'Panadería El Trigal',
        }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.commerce.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, profileId: PROFILE_ID, name: 'Panadería El Trigal' },
      })
    })

    it('usa un nombre por defecto si pendingCommerceName quedó vacío', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, subtype: null, categoryId: null, pendingCommerceName: null }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.commerce.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, profileId: PROFILE_ID, name: 'Mi Negocio' },
      })
    })

    it('no crea un Commerce duplicado si el usuario ya tiene uno', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, subtype: null, categoryId: null }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.BUSINESS, subtype: null },
      ])
      mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'existing-commerce' })

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.commerce.create).not.toHaveBeenCalled()
    })

    it('no crea un Commerce al activar un perfil que no es BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile())
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.commerce.create).not.toHaveBeenCalled()
    })

    it('no crea un Commerce al rechazar un perfil BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, subtype: null, categoryId: null }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([])
      mockPrismaService.userProfile.count.mockResolvedValue(0)

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.REJECTED, rejectionReason: 'No aplica' } as any)

      expect(mockPrismaService.commerce.create).not.toHaveBeenCalled()
    })

    it('NO otorga ningún rol al rechazar una solicitud PROFESSIONAL/FREELANCER', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile())
      mockPrismaService.userProfile.findMany.mockResolvedValue([]) // nada quedó ACTIVE
      mockPrismaService.userProfile.count.mockResolvedValue(0) // nunca tuvo perfiles de negocio

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.REJECTED, rejectionReason: 'No aplica' } as any)

      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('activa la Subscription del pendingPlanId al aprobar', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ pendingPlanId: PLAN_ID, pendingPlanInterval: BillingInterval.ANNUAL }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPlansService.activateSubscriptionForPlan).toHaveBeenCalledWith(
        mockPrismaService,
        USER_ID,
        PLAN_ID,
        BillingInterval.ANNUAL,
        ADMIN_ID,
      )
    })

    it('no activa ninguna Subscription si la solicitud no tenía pendingPlanId', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile({ pendingPlanId: null }))
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPlansService.activateSubscriptionForPlan).not.toHaveBeenCalled()
    })

    it('no activa ninguna Subscription al rechazar, aunque haya pendingPlanId', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile({ pendingPlanId: PLAN_ID }))
      mockPrismaService.userProfile.findMany.mockResolvedValue([])
      mockPrismaService.userProfile.count.mockResolvedValue(0)

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.REJECTED, rejectionReason: 'No aplica' } as any)

      expect(mockPlansService.activateSubscriptionForPlan).not.toHaveBeenCalled()
    })

    it('rechaza revisar una solicitud que ya no está PENDING', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile({ status: ProfileStatus.ACTIVE }))

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null)

      await expect(
        service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('setActive', () => {
    it('fija User.activeProfileId cuando el perfil es propio y está ACTIVE', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE }),
      )

      const result = await service.setActive(USER_ID, PROFILE_ID)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { activeProfileId: PROFILE_ID },
      })
      expect(result.id).toBe(PROFILE_ID)
    })

    it('lanza NotFoundException si el perfil no existe', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null)

      await expect(service.setActive(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(NotFoundException)
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('lanza NotFoundException si el perfil pertenece a otro usuario (no filtra por accidente)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, userId: 'other-user' }),
      )

      await expect(service.setActive(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(NotFoundException)
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('rechaza activar un perfil que todavía está PENDING', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.PENDING }),
      )

      await expect(service.setActive(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('rechaza activar un perfil REJECTED o SUSPENDED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.REJECTED }),
      )

      await expect(service.setActive(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('deactivate', () => {
    it('pasa un perfil ACTIVE a SUSPENDED con suspendedBySelf=true', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([]) // nada queda ACTIVE tras suspender

      const result = await service.deactivate(USER_ID, PROFILE_ID)

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: { status: ProfileStatus.SUSPENDED, suspendedBySelf: true },
      })
      expect(result.status).toBe(ProfileStatus.SUSPENDED)
    })

    it('limpia activeProfileId si era el perfil activo de contexto', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([])

      await service.deactivate(USER_ID, PROFILE_ID)

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: USER_ID, activeProfileId: PROFILE_ID },
        data: { activeProfileId: null },
      })
    })

    it('recalcula el rol si el tipo es PROFESSIONAL/BUSINESS', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.PROFESIONAL })
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.PROFESSIONAL, status: ProfileStatus.ACTIVE }),
      )
      mockPrismaService.userProfile.findMany.mockResolvedValue([]) // sin perfiles ACTIVE restantes -> vuelve a NORMAL
      mockPrismaService.userProfile.count.mockResolvedValue(1) // sí tuvo un UserProfile de negocio -> degrada a NORMAL

      await service.deactivate(USER_ID, PROFILE_ID)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.NORMAL },
      })
    })

    it('rechaza desactivar un perfil que no está ACTIVE', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.PENDING }),
      )

      await expect(service.deactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('lanza NotFoundException si el perfil pertenece a otro usuario', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, userId: 'other-user' }),
      )

      await expect(service.deactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('reactivate', () => {
    it('reactiva un perfil SUSPENDED por el propio usuario, sin volver a pedir aprobación', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.SUSPENDED, suspendedBySelf: true }),
      )
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null) // sin conflicto cruzado
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      const result = await service.reactivate(USER_ID, PROFILE_ID)

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { id: PROFILE_ID },
        data: { status: ProfileStatus.ACTIVE, suspendedBySelf: false },
      })
      expect(result.status).toBe(ProfileStatus.ACTIVE)
    })

    it('rechaza reactivar un perfil suspendido por un admin (suspendedBySelf=false)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.SUSPENDED, suspendedBySelf: false }),
      )

      await expect(service.reactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.userProfile.update).not.toHaveBeenCalled()
    })

    it('rechaza reactivar si el tipo opuesto (BUSINESS/PROFESSIONAL) ya está activo', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.PROFESSIONAL, status: ProfileStatus.SUSPENDED, suspendedBySelf: true }),
      )
      mockPrismaService.userProfile.findFirst.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, status: ProfileStatus.ACTIVE }),
      )

      await expect(service.reactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(ConflictException)
    })

    it('rechaza reactivar un perfil que no está SUSPENDED', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.ACTIVE, suspendedBySelf: true }),
      )

      await expect(service.reactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('lanza NotFoundException si el perfil pertenece a otro usuario', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ status: ProfileStatus.SUSPENDED, suspendedBySelf: true, userId: 'other-user' }),
      )

      await expect(service.reactivate(USER_ID, PROFILE_ID)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
