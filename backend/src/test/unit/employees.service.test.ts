import { Test, TestingModule } from '@nestjs/testing'
import { EmployeesService } from '../../employees/employees.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../plans/plan-limits.service'
import { CreateEmployeeDto } from '../../employees/dto/create-employee.dto'
import { UpdateEmployeeDto } from '../../employees/dto/update-employee.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('EmployeesService', () => {
  let service: EmployeesService
  let prismaService: PrismaService
  let planLimitsService: PlanLimitsService

  const mockPrismaService = {
    employee: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }

  const mockPlanLimitsService = {
    checkEmployeeLimit: jest.fn(),
    hasReachedEmployeeLimit: jest.fn(),
  }

  beforeEach(async () => {
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
      ],
    }).compile()

    service = module.get<EmployeesService>(EmployeesService)
    prismaService = module.get<PrismaService>(PrismaService)
    planLimitsService = module.get<PlanLimitsService>(PlanLimitsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new employee successfully', async () => {
      const commerceId = 'commerce-123'
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        position: 'CASHIER',
        salary: 1500,
        hireDate: '2024-01-01',
      }

      const mockEmployee = {
        id: 'employee-123',
        commerceId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        position: 'CASHIER',
        salary: 1500,
        hireDate: new Date('2024-01-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPlanLimitsService.checkEmployeeLimit.mockResolvedValue(true)
      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.employee.create.mockResolvedValue(mockEmployee)

      const result = await service.create(commerceId, createEmployeeDto)

      expect(result).toEqual(mockEmployee)
      expect(mockPlanLimitsService.checkEmployeeLimit).toHaveBeenCalledWith(commerceId)
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          position: 'CASHIER',
          salary: 1500,
          hireDate: new Date('2024-01-01'),
          isActive: true,
        },
      })
    })

    it('should throw error if employee email already exists', async () => {
      const commerceId = 'commerce-123'
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        position: 'CASHIER',
        salary: 1500,
      }

      mockPlanLimitsService.checkEmployeeLimit.mockResolvedValue(true)
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' })

      await expect(service.create(commerceId, createEmployeeDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw error if employee limit is reached', async () => {
      const commerceId = 'commerce-123'
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        position: 'CASHIER',
        salary: 1500,
      }

      mockPlanLimitsService.checkEmployeeLimit.mockRejectedValue(
        new Error('Employee limit reached')
      )

      await expect(service.create(commerceId, createEmployeeDto)).rejects.toThrow(
        'Employee limit reached'
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated employees', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: 1,
        limit: 10,
        position: 'CASHIER',
        isActive: true,
      }

      const mockEmployees = [
        {
          id: 'employee-1',
          firstName: 'John',
          lastName: 'Doe',
          position: 'CASHIER',
          isActive: true,
        },
        {
          id: 'employee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          position: 'CASHIER',
          isActive: true,
        },
      ]

      mockPrismaService.employee.findMany.mockResolvedValue(mockEmployees)
      mockPrismaService.employee.count.mockResolvedValue(2)

      const result = await service.findAll(commerceId, queryDto)

      expect(result).toEqual({
        employees: mockEmployees,
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
        position: 'MANAGER',
        isActive: true,
      }

      mockPrismaService.employee.findMany.mockResolvedValue([])
      mockPrismaService.employee.count.mockResolvedValue(0)

      await service.findAll(commerceId, queryDto)

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: {
          commerceId,
          position: 'MANAGER',
          isActive: true,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findOne', () => {
    it('should return employee by id', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'
      
      const mockEmployee = {
        id: employeeId,
        commerceId,
        firstName: 'John',
        lastName: 'Doe',
        position: 'CASHIER',
      }

      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee)

      const result = await service.findOne(employeeId, commerceId)

      expect(result).toEqual(mockEmployee)
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: employeeId },
      })
    })

    it('should throw error if employee not found', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'

      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(service.findOne(employeeId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('should update employee successfully', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'
      const updateEmployeeDto: UpdateEmployeeDto = {
        firstName: 'John Updated',
        salary: 1600,
      }

      const existingEmployee = {
        id: employeeId,
        commerceId,
        firstName: 'John',
        lastName: 'Doe',
        salary: 1500,
      }

      const updatedEmployee = {
        ...existingEmployee,
        firstName: 'John Updated',
        salary: 1600,
        updatedAt: new Date(),
      }

      mockPrismaService.employee.findUnique.mockResolvedValue(existingEmployee)
      mockPrismaService.employee.update.mockResolvedValue(updatedEmployee)

      const result = await service.update(employeeId, commerceId, updateEmployeeDto)

      expect(result).toEqual(updatedEmployee)
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: employeeId },
        data: {
          firstName: 'John Updated',
          salary: 1600,
        },
      })
    })

    it('should throw error if employee not found', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'
      const updateEmployeeDto: UpdateEmployeeDto = {
        firstName: 'John Updated',
      }

      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(service.update(employeeId, commerceId, updateEmployeeDto)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('should deactivate employee successfully', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'
      
      const existingEmployee = {
        id: employeeId,
        commerceId,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      }

      const deactivatedEmployee = {
        ...existingEmployee,
        isActive: false,
        updatedAt: new Date(),
      }

      mockPrismaService.employee.findUnique.mockResolvedValue(existingEmployee)
      mockPrismaService.employee.update.mockResolvedValue(deactivatedEmployee)

      const result = await service.remove(employeeId, commerceId)

      expect(result).toEqual(deactivatedEmployee)
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: employeeId },
        data: { isActive: false },
      })
    })

    it('should throw error if employee not found', async () => {
      const employeeId = 'employee-123'
      const commerceId = 'commerce-123'

      mockPrismaService.employee.findUnique.mockResolvedValue(null)

      await expect(service.remove(employeeId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('getStats', () => {
    it('should return employee statistics', async () => {
      const commerceId = 'commerce-123'
      
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        byPosition: [
          { position: 'CASHIER', _count: 5 },
          { position: 'MANAGER', _count: 2 },
          { position: 'COOK', _count: 3 },
        ],
        totalSalary: { _sum: { salary: 12000 } },
      }

      mockPrismaService.employee.count
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.active)
      mockPrismaService.employee.groupBy.mockResolvedValue(mockStats.byPosition)
      mockPrismaService.employee.aggregate.mockResolvedValue(mockStats.totalSalary)

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byPosition: {
          CASHIER: 5,
          MANAGER: 2,
          COOK: 3,
        },
        totalSalary: 12000,
      })
    })

    it('should handle zero employees gracefully', async () => {
      const commerceId = 'commerce-123'
      
      mockPrismaService.employee.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      mockPrismaService.employee.groupBy.mockResolvedValue([])
      mockPrismaService.employee.aggregate.mockResolvedValue({ _sum: { salary: null } })

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        byPosition: {},
        totalSalary: 0,
      })
    })
  })
})
