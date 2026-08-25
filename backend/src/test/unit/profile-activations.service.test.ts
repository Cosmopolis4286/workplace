import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ProfessionalSubtype, ProfileStatus, ProfileType, Role } from '@prisma/client'
import { ProfileActivationsService } from '../../domains/identity-access/profile-activations/profile-activations.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'

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
      user: { update: jest.fn() },
      userCategory: { findUnique: jest.fn() },
      userSubcategory: { findUnique: jest.fn() },
      userProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...pendingProfile(), ...data })),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    }

    const mockRedisService = { del: jest.fn() }
    const mockNotificationsService = { notifyProfileActivationReviewed: jest.fn().mockResolvedValue(undefined) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileActivationsService,
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

    it('al activar un perfil PROFESSIONAL/FREELANCER con KYC aprobado, otorga el rol FREELANCER real', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile())

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.FREELANCER },
      })
    })

    it('NO otorga rol FREELANCER si el perfil es PROFESSIONAL/SERVICE_PROVIDER (no freelancer)', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ subtype: ProfessionalSubtype.SERVICE_PROVIDER }),
      )

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: Role.FREELANCER }) }),
      )
    })

    it('NO otorga rol FREELANCER para un perfil BUSINESS', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        pendingProfile({ type: ProfileType.BUSINESS, subtype: null, categoryId: null }),
      )

      await service.review(PROFILE_ID, ADMIN_ID, { status: ProfileStatus.ACTIVE } as any)

      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('NO otorga rol FREELANCER al rechazar una solicitud PROFESSIONAL/FREELANCER', async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(pendingProfile())

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
})
