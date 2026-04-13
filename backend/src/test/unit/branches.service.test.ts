import { Test, TestingModule } from '@nestjs/testing'
import { BranchesService } from '../../branches/branches.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../plans/plan-limits.service'
import { CreateBranchDto } from '../../branches/dto/create-branch.dto'
import { UpdateBranchDto } from '../../branches/dto/update-branch.dto'
import { NotFoundException, BadRequestException } from '@nestjs/common'

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
    },
  }

  const mockPlanLimitsService = {
    checkBranchLimit: jest.fn(),
    hasReachedBranchLimit: jest.fn(),
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
        city: 'Caracas',
        state: 'Distrito Capital',
        country: 'Venezuela',
        postalCode: '1010',
        phone: '+582121234567',
        email: 'sucursal@ejemplo.com',
        coordinates: { lat: 10.4806, lng: -66.9036 },
        openingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '22:00' },
          saturday: { open: '09:00', close: '23:00' },
          sunday: { open: '09:00', close: '21:00' },
        },
        isActive: true,
        isMainBranch: false,
      }

      const mockBranch = {
        id: 'branch-123',
        commerceId,
        name: 'Sucursal Principal',
        address: 'Calle Principal #123',
        city: 'Caracas',
        state: 'Distrito Capital',
        country: 'Venezuela',
        postalCode: '1010',
        phone: '+582121234567',
        email: 'sucursal@ejemplo.com',
        coordinates: { lat: 10.4806, lng: -66.9036 },
        openingHours: createBranchDto.openingHours,
        isActive: true,
        isMainBranch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPlanLimitsService.checkBranchLimit.mockResolvedValue(true)
      mockPrismaService.branch.create.mockResolvedValue(mockBranch)

      const result = await service.create(commerceId, createBranchDto)

      expect(result).toEqual(mockBranch)
      expect(mockPlanLimitsService.checkBranchLimit).toHaveBeenCalledWith(commerceId)
      expect(mockPrismaService.branch.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          name: 'Sucursal Principal',
          address: 'Calle Principal #123',
          city: 'Caracas',
          state: 'Distrito Capital',
          country: 'Venezuela',
          postalCode: '1010',
          phone: '+582121234567',
          email: 'sucursal@ejemplo.com',
          coordinates: { lat: 10.4806, lng: -66.9036 },
          openingHours: createBranchDto.openingHours,
          isActive: true,
          isMainBranch: false,
        },
      })
    })

    it('should throw error if branch limit is reached', async () => {
      const commerceId = 'commerce-123'
      const createBranchDto: CreateBranchDto = {
        name: 'Nueva Sucursal',
        address: 'Calle Nueva #456',
        city: 'Caracas',
      }

      mockPlanLimitsService.checkBranchLimit.mockRejectedValue(
        new Error('Branch limit reached')
      )

      await expect(service.create(commerceId, createBranchDto)).rejects.toThrow(
        'Branch limit reached'
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated branches', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: 1,
        limit: 10,
        city: 'Caracas',
        isActive: true,
      }

      const mockBranches = [
        {
          id: 'branch-1',
          name: 'Sucursal Central',
          city: 'Caracas',
          isActive: true,
        },
        {
          id: 'branch-2',
          name: 'Sucursal Este',
          city: 'Caracas',
          isActive: true,
        },
      ]

      mockPrismaService.branch.findMany.mockResolvedValue(mockBranches)
      mockPrismaService.branch.count.mockResolvedValue(2)

      const result = await service.findAll(commerceId, queryDto)

      expect(result).toEqual({
        branches: mockBranches,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should apply filters correctly', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: 1,
        limit: 10,
        city: 'Maracaibo',
        isActive: true,
      }

      mockPrismaService.branch.findMany.mockResolvedValue([])
      mockPrismaService.branch.count.mockResolvedValue(0)

      await service.findAll(commerceId, queryDto)

      expect(mockPrismaService.branch.findMany).toHaveBeenCalledWith({
        where: {
          commerceId,
          city: 'Maracaibo',
          isActive: true,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findOne', () => {
    it('should return branch by id', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      
      const mockBranch = {
        id: branchId,
        commerceId,
        name: 'Sucursal Principal',
        address: 'Calle Principal #123',
        city: 'Caracas',
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch)

      const result = await service.findOne(branchId, commerceId)

      expect(result).toEqual(mockBranch)
      expect(mockPrismaService.branch.findUnique).toHaveBeenCalledWith({
        where: { id: branchId },
      })
    })

    it('should throw error if branch not found', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'

      mockPrismaService.branch.findUnique.mockResolvedValue(null)

      await expect(service.findOne(branchId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('should update branch successfully', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      const updateBranchDto: UpdateBranchDto = {
        name: 'Sucursal Actualizada',
        phone: '+582129876543',
      }

      const existingBranch = {
        id: branchId,
        commerceId,
        name: 'Sucursal Principal',
        phone: '+582121234567',
      }

      const updatedBranch = {
        ...existingBranch,
        name: 'Sucursal Actualizada',
        phone: '+582129876543',
        updatedAt: new Date(),
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(existingBranch)
      mockPrismaService.branch.update.mockResolvedValue(updatedBranch)

      const result = await service.update(branchId, commerceId, updateBranchDto)

      expect(result).toEqual(updatedBranch)
      expect(mockPrismaService.branch.update).toHaveBeenCalledWith({
        where: { id: branchId },
        data: {
          name: 'Sucursal Actualizada',
          phone: '+582129876543',
        },
      })
    })

    it('should throw error if branch not found', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      const updateBranchDto: UpdateBranchDto = {
        name: 'Updated Branch',
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(null)

      await expect(service.update(branchId, commerceId, updateBranchDto)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('should deactivate branch successfully', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      
      const existingBranch = {
        id: branchId,
        commerceId,
        name: 'Sucursal Principal',
        isActive: true,
        isMainBranch: false,
      }

      const deactivatedBranch = {
        ...existingBranch,
        isActive: false,
        updatedAt: new Date(),
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(existingBranch)
      mockPrismaService.branch.update.mockResolvedValue(deactivatedBranch)

      const result = await service.remove(branchId, commerceId)

      expect(result).toEqual(deactivatedBranch)
      expect(mockPrismaService.branch.update).toHaveBeenCalledWith({
        where: { id: branchId },
        data: { isActive: false },
      })
    })

    it('should throw error if trying to deactivate main branch', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      
      const existingBranch = {
        id: branchId,
        commerceId,
        name: 'Sucursal Principal',
        isActive: true,
        isMainBranch: true,
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(existingBranch)

      await expect(service.remove(branchId, commerceId)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw error if branch not found', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'

      mockPrismaService.branch.findUnique.mockResolvedValue(null)

      await expect(service.remove(branchId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('setMainBranch', () => {
    it('should set branch as main branch successfully', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'
      
      const existingBranch = {
        id: branchId,
        commerceId,
        name: 'Sucursal Nueva',
        isMainBranch: false,
      }

      const updatedBranch = {
        ...existingBranch,
        isMainBranch: true,
        updatedAt: new Date(),
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(existingBranch)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService)
      })
      mockPrismaService.branch.update
        .mockResolvedValueOnce({}) // Reset previous main branch
        .mockResolvedValueOnce(updatedBranch) // Set new main branch

      const result = await service.setMainBranch(branchId, commerceId)

      expect(result).toEqual(updatedBranch)
      expect(mockPrismaService.branch.update).toHaveBeenCalledTimes(2)
    })

    it('should throw error if branch not found', async () => {
      const branchId = 'branch-123'
      const commerceId = 'commerce-123'

      mockPrismaService.branch.findUnique.mockResolvedValue(null)

      await expect(service.setMainBranch(branchId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('getStats', () => {
    it('should return branch statistics', async () => {
      const commerceId = 'commerce-123'
      
      const mockStats = {
        total: 5,
        active: 4,
        inactive: 1,
        byCity: [
          { city: 'Caracas', _count: 3 },
          { city: 'Maracaibo', _count: 2 },
        ],
      }

      mockPrismaService.branch.count
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.active)
      mockPrismaService.branch.groupBy.mockResolvedValue(mockStats.byCity)

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 5,
        active: 4,
        inactive: 1,
        byCity: {
          'Caracas': 3,
          'Maracaibo': 2,
        },
      })
    })

    it('should handle zero branches gracefully', async () => {
      const commerceId = 'commerce-123'
      
      mockPrismaService.branch.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      mockPrismaService.branch.groupBy.mockResolvedValue([])

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        byCity: {},
      })
    })
  })

  describe('getMainBranch', () => {
    it('should return main branch for commerce', async () => {
      const commerceId = 'commerce-123'
      
      const mockMainBranch = {
        id: 'branch-123',
        commerceId,
        name: 'Sucursal Principal',
        isMainBranch: true,
      }

      mockPrismaService.branch.findUnique.mockResolvedValue(mockMainBranch)

      const result = await service.getMainBranch(commerceId)

      expect(result).toEqual(mockMainBranch)
      expect(mockPrismaService.branch.findUnique).toHaveBeenCalledWith({
        where: {
          commerceId_isMainBranch: {
            commerceId,
            isMainBranch: true,
          },
        },
      })
    })

    it('should return null if no main branch exists', async () => {
      const commerceId = 'commerce-123'

      mockPrismaService.branch.findUnique.mockResolvedValue(null)

      const result = await service.getMainBranch(commerceId)

      expect(result).toBeNull()
    })
  })
})
