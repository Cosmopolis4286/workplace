import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ProfessionalSubtype, ProfileStatus, ProfileType, Role } from '@prisma/client'
import { ProfileActivationsService } from '../../domains/identity-access/profile-activations/profile-activations.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { RoleResolverService } from '../../common/account-type/role-resolver.service'

describe('ProfileActivationsService', () => {
  let service: ProfileActivationsService
  let mockPrismaService: any

  const USER_ID = 'user-1'
  const ADMIN_ID = 'admin-1'
  const PROFILE_ID = 'profile-1'
  const CATEGORY_ID = 'cat-1'

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
      user: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }) },
      userCategory: { findUnique: jest.fn() },
      userSubcategory: { findUnique: jest.fn() },
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileActivationsService,
        RoleResolverService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
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
})
