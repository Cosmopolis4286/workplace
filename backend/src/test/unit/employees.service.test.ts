import { Test, TestingModule } from '@nestjs/testing'
import { EmployeesService } from '../../domains/commerce-core/employees/employees.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../domains/money/plans/plan-limits.service'
import { CreateEmployeeDto } from '../../domains/commerce-core/employees/dto/create-employee.dto'
import { UpdateEmployeeDto } from '../../domains/commerce-core/employees/dto/update-employee.dto'
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'

describe('EmployeesService', () => {
  let service: EmployeesService

  const mockPrismaService = {
    restaurant: {
      findUnique: jest.fn(),
    },
    employee: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  }

  const mockPlanLimitsService = {
    assertEmployeeLimit: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  const commerceId = 'commerce-123'
  const userId = 'user-123'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
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

    service = module.get<EmployeesService>(EmployeesService)

    // Default: user always resolves to commerceId
    mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: commerceId })
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new employee successfully', async () => {
      const createDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'CASHIER',
      }

      const mockEmployee = {
        id: 'employee-123',
        commerceId,
        ...createDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPlanLimitsService.assertEmployeeLimit.mockResolvedValue(undefined)
      mockPrismaService.employee.findUnique.mockResolvedValue(null)
      mockPrismaService.employee.create.mockResolvedValue(mockEmployee)

      const result = await service.create(userId, createDto)

      expect(result).toEqual(mockEmployee)
      expect(mockPlanLimitsService.assertEmployeeLimit).toHaveBeenCalledWith(userId, commerceId)
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: { ...createDto, commerceId },
      })
    })

    it('should throw ConflictException if email already exists', async () => {
      const createDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'CASHIER',
      }

      mockPlanLimitsService.assertEmployeeLimit.mockResolvedValue(undefined)
      mockPrismaService.employee.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(service.create(userId, createDto)).rejects.toThrow(ConflictException)
    })

    it('should throw if employee limit is reached', async () => {
      const createDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        role: 'CASHIER',
      }

      mockPlanLimitsService.assertEmployeeLimit.mockRejectedValue(
        new Error('Employee limit reached')
      )

      await expect(service.create(userId, createDto)).rejects.toThrow('Employee limit reached')
    })

    it('should fall back to userId as commerceId if user has no restaurant', async () => {
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null)
      mockPlanLimitsService.assertEmployeeLimit.mockResolvedValue(undefined)
      mockPrismaService.employee.findUnique.mockResolvedValue(null)
      mockPrismaService.employee.create.mockResolvedValue({ id: 'employee-1' })

      await service.create(userId, { firstName: 'A', lastName: 'B', role: 'CASHIER' })

      expect(mockPlanLimitsService.assertEmployeeLimit).toHaveBeenCalledWith(userId, userId)
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: { firstName: 'A', lastName: 'B', role: 'CASHIER', commerceId: userId },
      })
    })
  })

  describe('findAll', () => {
    it('should return employees for the user commerce', async () => {
      const mockEmployees = [
        { id: 'e-1', firstName: 'John', lastName: 'Doe', commerceId },
        { id: 'e-2', firstName: 'Jane', lastName: 'Smith', commerceId },
      ]

      mockPrismaService.employee.findMany.mockResolvedValue(mockEmployees)

      const result = await service.findAll(userId)

      expect(result).toEqual(mockEmployees)
      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { commerceId },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
    })
  })

  describe('findOne', () => {
    it('should return employee by id', async () => {
      const mockEmployee = {
        id: 'employee-123',
        commerceId,
        firstName: 'John',
        lastName: 'Doe',
      }

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee)

      const result = await service.findOne(userId, 'employee-123')

      expect(result).toEqual(mockEmployee)
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 'employee-123' },
      })
    })

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(service.findOne(userId, 'employee-999')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if employee belongs to different commerce', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue({
        id: 'employee-123',
        commerceId: 'other-commerce',
      })

      await expect(service.findOne(userId, 'employee-123')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should update employee successfully', async () => {
      const updateDto: UpdateEmployeeDto = { firstName: 'John Updated' }
      const existingEmployee = { id: 'employee-123', commerceId, firstName: 'John' }
      const updatedEmployee = { ...existingEmployee, firstName: 'John Updated' }

      mockPrismaService.employee.findUnique.mockResolvedValue(existingEmployee)
      mockPrismaService.employee.update.mockResolvedValue(updatedEmployee)

      const result = await service.update(userId, 'employee-123', updateDto)

      expect(result).toEqual(updatedEmployee)
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 'employee-123' },
        data: updateDto,
      })
    })

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(
        service.update(userId, 'employee-999', { firstName: 'X' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should delete employee successfully', async () => {
      const existingEmployee = { id: 'employee-123', commerceId }

      mockPrismaService.employee.findUnique.mockResolvedValue(existingEmployee)
      mockPrismaService.employee.delete.mockResolvedValue(existingEmployee)

      await service.remove(userId, 'employee-123')

      expect(mockPrismaService.employee.delete).toHaveBeenCalledWith({
        where: { id: 'employee-123' },
      })
    })

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(service.remove(userId, 'employee-999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleStatus', () => {
    it('should toggle employee to inactive', async () => {
      const activeEmployee = { id: 'employee-123', commerceId, isActive: true }
      const inactiveEmployee = { ...activeEmployee, isActive: false }

      mockPrismaService.employee.findUnique.mockResolvedValue(activeEmployee)
      mockPrismaService.employee.update.mockResolvedValue(inactiveEmployee)

      const result = await service.toggleStatus(userId, 'employee-123')

      expect(result.isActive).toBe(false)
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 'employee-123' },
        data: { isActive: false },
      })
    })

    it('should toggle employee to active', async () => {
      const inactiveEmployee = { id: 'employee-123', commerceId, isActive: false }
      const activeEmployee = { ...inactiveEmployee, isActive: true }

      mockPrismaService.employee.findUnique.mockResolvedValue(inactiveEmployee)
      mockPrismaService.employee.update.mockResolvedValue(activeEmployee)

      const result = await service.toggleStatus(userId, 'employee-123')

      expect(result.isActive).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return employee statistics', async () => {
      mockPrismaService.employee.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
      mockPrismaService.employee.groupBy.mockResolvedValue([
        { role: 'CASHIER', _count: { role: 5 } },
        { role: 'MANAGER', _count: { role: 2 } },
        { role: 'COOK', _count: { role: 3 } },
      ])

      const result = await service.getStats(userId)

      expect(result).toEqual({
        total: 10,
        active: 8,
        byRole: { CASHIER: 5, MANAGER: 2, COOK: 3 },
      })
    })
  })
})
