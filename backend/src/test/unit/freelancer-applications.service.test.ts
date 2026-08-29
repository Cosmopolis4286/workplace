import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { ProfessionalSubtype, ProfileType, Role } from '@prisma/client'
import { FreelancerApplicationsService } from '../../domains/identity-access/freelancer-applications/freelancer-applications.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { RoleResolverService } from '../../common/account-type/role-resolver.service'

describe('FreelancerApplicationsService', () => {
  let service: FreelancerApplicationsService
  let mockPrismaService: any

  const USER_ID = 'user-1'
  const ADMIN_ID = 'admin-1'
  const APPLICATION_ID = 'app-1'
  const CATEGORY_ID = 'cat-1'

  function pendingApplication(overrides: Partial<any> = {}) {
    return {
      id: APPLICATION_ID,
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      subcategoryId: null,
      status: 'PENDING',
      user: { kycStatus: 'APPROVED' },
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }), update: jest.fn() },
      userCategory: { findUnique: jest.fn() },
      userSubcategory: { findUnique: jest.fn() },
      freelancerApplication: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...pendingApplication(), ...data })),
      },
      userProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'profile-1' }),
        update: jest.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      // Transacción interactiva: el callback recibe el mismo mock como `tx`.
      $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
    }

    const mockRedisService = { del: jest.fn() }
    const mockNotificationsService = { notifyFreelancerApplicationReviewed: jest.fn().mockResolvedValue(undefined) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreelancerApplicationsService,
        RoleResolverService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile()

    service = module.get<FreelancerApplicationsService>(FreelancerApplicationsService)
  })

  describe('create', () => {
    it('rechaza la solicitud si el usuario no es NORMAL', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.PROFESIONAL })

      await expect(
        service.create(USER_ID, { categoryId: CATEGORY_ID } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rechaza si ya tiene una solicitud PENDING', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.NORMAL })
      mockPrismaService.freelancerApplication.findFirst.mockResolvedValue(pendingApplication())

      await expect(
        service.create(USER_ID, { categoryId: CATEGORY_ID } as any),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('crea la solicitud cuando el usuario es NORMAL, sin pendientes y la categoría existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: Role.NORMAL })
      mockPrismaService.freelancerApplication.findFirst.mockResolvedValue(null)
      mockPrismaService.userCategory.findUnique.mockResolvedValue({ id: CATEGORY_ID })
      mockPrismaService.freelancerApplication.create.mockResolvedValue(pendingApplication())

      const result = await service.create(USER_ID, { categoryId: CATEGORY_ID, message: 'Tengo experiencia' } as any)

      expect(mockPrismaService.freelancerApplication.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, categoryId: CATEGORY_ID, subcategoryId: undefined, message: 'Tengo experiencia' },
      })
      expect(result.status).toBe('PENDING')
    })
  })

  describe('review', () => {
    it('bloquea la aprobación si el KYC del solicitante no está APPROVED', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(
        pendingApplication({ user: { kycStatus: 'PENDING' } }),
      )

      await expect(
        service.review(APPLICATION_ID, ADMIN_ID, { status: 'APPROVED' } as any),
      ).rejects.toThrow('debe tener su identidad verificada')
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('permite rechazar aunque el KYC no esté aprobado', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(
        pendingApplication({ user: { kycStatus: 'NONE' } }),
      )

      await expect(
        service.review(APPLICATION_ID, ADMIN_ID, { status: 'REJECTED', rejectionReason: 'No aplica' } as any),
      ).resolves.toBeDefined()
    })

    it('al aprobar con KYC aprobado, copia categoría/subcategoría y otorga el rol PROFESIONAL vía RoleResolverService', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(pendingApplication())
      // Sin linkedProfile (dual-write no dejó nada PENDING): el servicio
      // debe crear un UserProfile ACTIVE self-healing antes de sincronizar role.
      mockPrismaService.userProfile.findFirst.mockResolvedValue(null)
      // syncRoleForUser relee tras el create() self-healing de arriba.
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(APPLICATION_ID, ADMIN_ID, { status: 'APPROVED' } as any)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { categoryId: CATEGORY_ID, subcategoryId: null },
      })
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { role: Role.PROFESIONAL },
      })
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: USER_ID, type: ProfileType.PROFESSIONAL, status: 'ACTIVE' }),
        }),
      )
    })

    it('si ya existe un UserProfile PENDING vinculado, lo actualiza en vez de crear uno nuevo', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(pendingApplication())
      mockPrismaService.userProfile.findFirst.mockResolvedValue({ id: 'profile-1' })
      mockPrismaService.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
      ])

      await service.review(APPLICATION_ID, ADMIN_ID, { status: 'APPROVED' } as any)

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'profile-1' }, data: expect.objectContaining({ status: 'ACTIVE' }) }),
      )
      expect(mockPrismaService.userProfile.create).not.toHaveBeenCalled()
    })

    it('rechaza revisar una solicitud que ya no está PENDING', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(pendingApplication({ status: 'APPROVED' }))

      await expect(
        service.review(APPLICATION_ID, ADMIN_ID, { status: 'APPROVED' } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockPrismaService.freelancerApplication.findUnique.mockResolvedValue(null)

      await expect(
        service.review(APPLICATION_ID, ADMIN_ID, { status: 'APPROVED' } as any),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
