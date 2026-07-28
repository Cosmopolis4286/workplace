import { Test, TestingModule } from '@nestjs/testing'
import { BranchesService } from '../../domains/commerce-core/branches/branches.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../domains/money/plans/plan-limits.service'
import { CreateBranchDto } from '../../domains/commerce-core/branches/dto/create-branch.dto'
import { UpdateBranchDto } from '../../domains/commerce-core/branches/dto/update-branch.dto'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'

describe('BranchesService', () => {
  let service: BranchesService
  let prismaService: PrismaService
  let planLimitsService: PlanLimitsService

  const mockPrismaService = {
    branch: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const mockPlanLimitsService = {
    assertBranchLimit: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PlanLimitsService,
          useValue: mockPlanLimitsService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile()

    service = module.get<BranchesService>(BranchesService)
    prismaService = module.get<PrismaService>(PrismaService)
    planLimitsService = module.get<PlanLimitsService>(PlanLimitsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new branch successfully', async () => {
      const commerceId = 'commerce-123'
      const createBranchDto: CreateBranchDto = {
        name: 'Sucursal Principal',
        address: 'Calle Principal #123',
        phone: '+582121234567',
        email: 'sucursal@ejemplo.com',
      }

      const mockBranch = {
        id: 'branch-123',
        commerceId,
        name: 'Sucursal Principal',
        address: 'Calle Principal #123',
        phone: '+582121234567',
        email: 'sucursal@ejemplo.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: commerceId })
      mockPlanLimitsService.assertBranchLimit.mockResolvedValue(undefined)
      mockPrismaService.branch.create.mockResolvedValue(mockBranch)

      const result = await service.create('user-id', createBranchDto)

      expect(result).toEqual(mockBranch)
      expect(mockPlanLimitsService.assertBranchLimit).toHaveBeenCalledWith('user-id', commerceId)
      expect(mockPrismaService.branch.create).toHaveBeenCalledWith({
        data: { ...createBranchDto, commerceId },
      })
    })

    it('should throw error if branch limit is reached', async () => {
      const commerceId = 'commerce-123'
      const createBranchDto: CreateBranchDto = {
        name: 'Nueva Sucursal',
        address: 'Calle Nueva #456',
      }

      mockPlanLimitsService.assertBranchLimit.mockRejectedValue(
        new Error('Branch limit reached')
      )

      await expect(service.create('user-id', createBranchDto)).rejects.toThrow(
        'Branch limit reached'
      )
    })
  })

  describe('findAll', () => {
    it('should return all branches for user', async () => {
      const userId = 'user-123'

      const mockBranches = [
        {
          id: 'branch-1',
          name: 'Sucursal Central',
        },
        {
          id: 'branch-2',
          name: 'Sucursal Este',
        },
      ]

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
      mockPrismaService.branch.findMany.mockResolvedValue(mockBranches)

      const result = await service.findAll(userId)

      expect(result).toEqual(mockBranches)
    })

  })

  describe('findOne', () => {
    it('should return branch by id', async () => {
      const userId = 'user-123'
      const branchId = 'branch-123'
      
      const mockBranch = {
        id: branchId,
        commerceId: 'commerce-123',
        name: 'Sucursal Principal',
      }

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch)

      const result = await service.findOne(userId, branchId)

      expect(result).toEqual(mockBranch)
    })
  })

  describe('update', () => {
    it('should update branch successfully', async () => {
      const userId = 'user-123'
      const branchId = 'branch-123'
      const updateBranchDto: UpdateBranchDto = {
        name: 'Sucursal Actualizada',
      }

      const existingBranch = {
        id: branchId,
        commerceId: 'commerce-123',
        name: 'Sucursal Principal',
      }

      const updatedBranch = {
        ...existingBranch,
        name: 'Sucursal Actualizada',
      }

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
      mockPrismaService.branch.findUnique.mockResolvedValue(existingBranch)
      mockPrismaService.branch.update.mockResolvedValue(updatedBranch)

      const result = await service.update(userId, branchId, updateBranchDto)

      expect(result).toEqual(updatedBranch)
    })
  })

  describe('remove', () => {
    it('should remove branch successfully', async () => {
      const userId = 'user-123'
      const branchId = 'branch-123'

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
      mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, commerceId: 'commerce-123' })
      mockPrismaService.branch.delete.mockResolvedValue({ id: branchId })

      await service.remove(userId, branchId)

      expect(mockPrismaService.branch.delete).toHaveBeenCalledWith({
        where: { id: branchId },
      })
    })
  })


  describe('getStats', () => {
    it('should return branch statistics', async () => {
      const userId = 'user-123'
      
      const mockStats = {
        total: 5,
        active: 4,
        byStatus: [
          { status: 'ACTIVE', _count: { status: 4 } },
          { status: 'INACTIVE', _count: { status: 1 } },
        ],
      }

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
      mockPrismaService.branch.count
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.active)
      mockPrismaService.branch.groupBy.mockResolvedValue(mockStats.byStatus)

      const result = await service.getStats(userId)

      expect(result).toEqual({
        total: 5,
        active: 4,
        byStatus: {
          'ACTIVE': 4,
          'INACTIVE': 1,
        },
      })
    })
  })

})
