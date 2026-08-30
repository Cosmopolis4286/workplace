import { Test, TestingModule } from '@nestjs/testing'
import { ProfessionalSubtype, ProfileStatus, ProfileType } from '@prisma/client'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'
import { PrismaService } from '../../prisma/prisma.service'

describe('AccountTypeResolver', () => {
  let service: AccountTypeResolver
  let mockPrisma: any

  beforeEach(async () => {
    mockPrisma = {
      userProfile: { findMany: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountTypeResolver, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<AccountTypeResolver>(AccountTypeResolver)
  })

  describe('resolve', () => {
    it('returns null when the user has no active business profile', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([])

      const result = await service.resolve('user-1')

      expect(result).toBeNull()
    })

    it('returns FREELANCER when only a PROFESSIONAL profile is active (activated via ProfileActivationsService, no FreelancerApplication involved)', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL },
      ])

      const result = await service.resolve('user-1')

      expect(result).toBe('FREELANCER')
    })

    it('returns COMMERCE when only a BUSINESS profile is active', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([{ type: ProfileType.BUSINESS }])

      const result = await service.resolve('user-1')

      expect(result).toBe('COMMERCE')
    })

    it('prioritizes COMMERCE when BUSINESS and PROFESSIONAL are both active simultaneously', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { type: ProfileType.PROFESSIONAL },
        { type: ProfileType.BUSINESS },
      ])

      const result = await service.resolve('user-1')

      expect(result).toBe('COMMERCE')
    })

    it('only queries ACTIVE profiles of BUSINESS/PROFESSIONAL type (CUSTOMER/JOB_SEEKER never affect accountType)', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([])

      await service.resolve('user-1')

      expect(mockPrisma.userProfile.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: ProfileStatus.ACTIVE,
          type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] },
        },
        select: { type: true },
      })
    })
  })

  describe('resolveDetailed', () => {
    it('returns accountType null and an empty activeProfiles list when there are no active profiles', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([])

      const result = await service.resolveDetailed('user-1')

      expect(result).toEqual({ accountType: null, activeProfiles: [] })
    })

    it('includes CUSTOMER/JOB_SEEKER profiles in activeProfiles even though they never affect accountType', async () => {
      const customerProfile = { id: 'p1', type: ProfileType.CUSTOMER, subtype: null }
      const jobSeekerProfile = { id: 'p2', type: ProfileType.JOB_SEEKER, subtype: null }
      mockPrisma.userProfile.findMany.mockResolvedValue([customerProfile, jobSeekerProfile])

      const result = await service.resolveDetailed('user-1')

      expect(result.accountType).toBeNull()
      expect(result.activeProfiles).toEqual([customerProfile, jobSeekerProfile])
    })

    it('resolves accountType from the same set it returns in activeProfiles (single query, no duplicated lookups)', async () => {
      const businessProfile = { id: 'p1', type: ProfileType.BUSINESS, subtype: null }
      const customerProfile = { id: 'p2', type: ProfileType.CUSTOMER, subtype: null }
      mockPrisma.userProfile.findMany.mockResolvedValue([businessProfile, customerProfile])

      const result = await service.resolveDetailed('user-1')

      expect(result.accountType).toBe('COMMERCE')
      expect(result.activeProfiles).toHaveLength(2)
      expect(mockPrisma.userProfile.findMany).toHaveBeenCalledTimes(1)
    })

    it('queries all ACTIVE profiles regardless of type, unlike resolve() which filters to BUSINESS/PROFESSIONAL', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([])

      await service.resolveDetailed('user-1')

      expect(mockPrisma.userProfile.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: ProfileStatus.ACTIVE },
      })
    })

    it('prioritizes COMMERCE over FREELANCER when both BUSINESS and PROFESSIONAL are active, same as resolve()', async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        { id: 'p1', type: ProfileType.PROFESSIONAL, subtype: ProfessionalSubtype.FREELANCER },
        { id: 'p2', type: ProfileType.BUSINESS, subtype: null },
      ])

      const result = await service.resolveDetailed('user-1')

      expect(result.accountType).toBe('COMMERCE')
    })
  })

  describe('isFreelancer / isCommerce', () => {
    it('isFreelancer is true only for FREELANCER', () => {
      expect(service.isFreelancer('FREELANCER')).toBe(true)
      expect(service.isFreelancer('COMMERCE')).toBe(false)
      expect(service.isFreelancer(null)).toBe(false)
    })

    it('isCommerce is true only for COMMERCE', () => {
      expect(service.isCommerce('COMMERCE')).toBe(true)
      expect(service.isCommerce('FREELANCER')).toBe(false)
      expect(service.isCommerce(null)).toBe(false)
    })
  })
})
