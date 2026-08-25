import { Test, TestingModule } from '@nestjs/testing'
import { ProfessionalSubtype, ProfileStatus, ProfileType, Role } from '@prisma/client'
import { RoleResolverService } from '../../common/account-type/role-resolver.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('RoleResolverService', () => {
  let service: RoleResolverService
  let mockPrisma: any

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      userProfile: { findMany: jest.fn(), count: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleResolverService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<RoleResolverService>(RoleResolverService)
  })

  describe('resolveFromProfiles', () => {
    it('returns PROFESIONAL when a BUSINESS profile is present', () => {
      const result = service.resolveFromProfiles([{ type: ProfileType.BUSINESS, subtype: null }])
      expect(result).toBe(Role.PROFESIONAL)
    })

    it('returns PROFESIONAL when a PROFESSIONAL profile is present (either subtype)', () => {
      expect(service.resolveFromProfiles([{ type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER }])).toBe(Role.PROFESIONAL)
      expect(service.resolveFromProfiles([{ type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.SERVICE_PROVIDER }])).toBe(Role.PROFESIONAL)
    })

    it('returns PROFESIONAL when both BUSINESS and PROFESSIONAL are active simultaneously (Role no distingue cuál)', () => {
      const result = service.resolveFromProfiles([
        { type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
        { type: ProfileType.BUSINESS, subtype: null },
      ])
      expect(result).toBe(Role.PROFESIONAL)
    })

    it('returns null when there are no business profiles', () => {
      expect(service.resolveFromProfiles([])).toBeNull()
    })
  })

  describe('syncRoleForUser', () => {
    it('does nothing and returns null when the user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await service.syncRoleForUser('missing-user')

      expect(result).toBeNull()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('never touches SUPERADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.SUPERADMIN })

      const result = await service.syncRoleForUser('admin-1')

      expect(result).toBe(Role.SUPERADMIN)
      expect(mockPrisma.userProfile.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('never touches ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN })

      const result = await service.syncRoleForUser('admin-2')

      expect(result).toBe(Role.ADMIN)
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('promotes NORMAL to PROFESIONAL when a BUSINESS profile is active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.NORMAL })
      mockPrisma.userProfile.findMany.mockResolvedValue([{ type: ProfileType.BUSINESS, subtype: null }])
      mockPrisma.userProfile.count.mockResolvedValue(1)

      const result = await service.syncRoleForUser('user-1')

      expect(result).toBe(Role.PROFESIONAL)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { role: Role.PROFESIONAL } })
    })

    it('demotes to NORMAL when a previously-active business profile is no longer active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.PROFESIONAL })
      mockPrisma.userProfile.findMany.mockResolvedValue([]) // ya no hay ACTIVE
      mockPrisma.userProfile.count.mockResolvedValue(1) // pero sí tuvo un UserProfile alguna vez (rejected/suspended)

      const result = await service.syncRoleForUser('user-1')

      expect(result).toBe(Role.NORMAL)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { role: Role.NORMAL } })
    })

    it('does NOT demote a legacy PROFESIONAL user who never went through UserProfile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.PROFESIONAL })
      mockPrisma.userProfile.findMany.mockResolvedValue([])
      mockPrisma.userProfile.count.mockResolvedValue(0) // nunca tuvo ningún UserProfile de negocio

      const result = await service.syncRoleForUser('legacy-user')

      expect(result).toBe(Role.PROFESIONAL)
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('is a no-op when the resolved role already matches the current role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.PROFESIONAL })
      mockPrisma.userProfile.findMany.mockResolvedValue([{ type: ProfileType.BUSINESS, subtype: null }])
      mockPrisma.userProfile.count.mockResolvedValue(1)

      const result = await service.syncRoleForUser('user-1')

      expect(result).toBe(Role.PROFESIONAL)
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('queries active profiles scoped to ACTIVE status and business types only', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.NORMAL })
      mockPrisma.userProfile.findMany.mockResolvedValue([])
      mockPrisma.userProfile.count.mockResolvedValue(0)

      await service.syncRoleForUser('user-1')

      expect(mockPrisma.userProfile.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: ProfileStatus.ACTIVE, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
        select: { type: true, subtype: true },
      })
    })

    it('accepts a transactional client instead of the default PrismaService', async () => {
      const txMock = {
        user: { findUnique: jest.fn().mockResolvedValue({ role: Role.NORMAL }), update: jest.fn() },
        userProfile: {
          findMany: jest.fn().mockResolvedValue([{ type: ProfileType.BUSINESS, subtype: null }]),
          count: jest.fn().mockResolvedValue(1),
        },
      }

      const result = await service.syncRoleForUser('user-1', txMock as any)

      expect(result).toBe(Role.PROFESIONAL)
      expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { role: Role.PROFESIONAL } })
      // No debe tocar el PrismaService por defecto cuando se pasa un tx explícito.
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })
  })
})
