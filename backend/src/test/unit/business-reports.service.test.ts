import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { BusinessReportsService } from '../../domains/platform/reports/business-reports.service'
import { OrdersService } from '../../domains/operations/orders/orders.service'
import { ExpensesService } from '../../domains/operations/expenses/expenses.service'
import { EmployeesService } from '../../domains/commerce-core/employees/employees.service'
import { ServicesService } from '../../domains/commerce-core/services/services.service'
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'
import { PERMISSIONS_FACADE } from '../../domains/identity-access/permissions/permissions.facade'

describe('BusinessReportsService', () => {
  let service: BusinessReportsService
  let ordersService: { getStats: jest.Mock; getPlatformStats: jest.Mock }
  let expensesService: { getStats: jest.Mock; getPlatformStats: jest.Mock }
  let employeesService: { getStats: jest.Mock; getPlatformStats: jest.Mock }
  let servicesService: { getMyServiceRequestsStats: jest.Mock }
  let permissionsFacade: { hasEffectivePermission: jest.Mock }
  let accountTypeResolver: { resolve: jest.Mock }

  beforeEach(async () => {
    ordersService = {
      getStats: jest.fn().mockResolvedValue({ totalOrders: 10 }),
      getPlatformStats: jest.fn().mockResolvedValue({ totalOrders: 1000 }),
    }
    expensesService = {
      getStats: jest.fn().mockResolvedValue({ totalMonthly: 500 }),
      getPlatformStats: jest.fn().mockResolvedValue({ totalMonthly: 50000 }),
    }
    employeesService = {
      getStats: jest.fn().mockResolvedValue({ total: 3 }),
      getPlatformStats: jest.fn().mockResolvedValue({ total: 300 }),
    }
    servicesService = { getMyServiceRequestsStats: jest.fn().mockResolvedValue({ total: 7 }) }
    permissionsFacade = { hasEffectivePermission: jest.fn().mockResolvedValue(true) }
    accountTypeResolver = { resolve: jest.fn().mockResolvedValue('COMMERCE') }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessReportsService,
        { provide: OrdersService, useValue: ordersService },
        { provide: ExpensesService, useValue: expensesService },
        { provide: EmployeesService, useValue: employeesService },
        { provide: ServicesService, useValue: servicesService },
        { provide: CommerceResolverService, useValue: { resolve: jest.fn().mockResolvedValue('commerce-123') } },
        { provide: AccountTypeResolver, useValue: accountTypeResolver },
        { provide: PERMISSIONS_FACADE, useValue: permissionsFacade },
      ],
    }).compile()

    service = module.get(BusinessReportsService)
  })

  it('returns orders/expenses/employees for a COMMERCE user', async () => {
    const result = await service.getSummary('user-1', Role.PROFESIONAL)

    expect(result.isFreelancer).toBe(false)
    expect(result.orders).toEqual({ totalOrders: 10 })
    expect(result.expenses).toEqual({ totalMonthly: 500 })
    expect(result.employees).toEqual({ total: 3 })
  })

  it('returns ServiceRequest stats and omits expenses/employees for a FREELANCER user', async () => {
    accountTypeResolver.resolve.mockResolvedValue('FREELANCER')

    const result = await service.getSummary('user-2', Role.PROFESIONAL)

    expect(result.isFreelancer).toBe(true)
    expect(result.orders).toEqual({ total: 7 })
    expect(result.expenses).toBeNull()
    expect(result.employees).toBeNull()
    expect(ordersService.getStats).not.toHaveBeenCalled()
  })

  it('omits the employees section instead of failing when the user lacks employees:view', async () => {
    permissionsFacade.hasEffectivePermission.mockResolvedValue(false)

    const result = await service.getSummary('user-3', Role.PROFESIONAL)

    expect(result.employees).toBeNull()
    expect(result.orders).toEqual({ totalOrders: 10 })
    expect(result.expenses).toEqual({ totalMonthly: 500 })
    expect(employeesService.getStats).not.toHaveBeenCalled()
  })

  describe('getPlatformSummary (SUPERADMIN/ADMIN)', () => {
    it('aggregates orders/expenses/employees across the whole platform, not a single commerce', async () => {
      const result = await service.getPlatformSummary()

      expect(result.isFreelancer).toBe(false)
      expect(result.orders).toEqual({ totalOrders: 1000 })
      expect(result.expenses).toEqual({ totalMonthly: 50000 })
      expect(result.employees).toEqual({ total: 300 })
      expect(ordersService.getPlatformStats).toHaveBeenCalled()
      expect(expensesService.getPlatformStats).toHaveBeenCalled()
      expect(employeesService.getPlatformStats).toHaveBeenCalled()
      // No debe intentar resolver un Commerce propio para el admin.
      expect(ordersService.getStats).not.toHaveBeenCalled()
      expect(expensesService.getStats).not.toHaveBeenCalled()
      expect(employeesService.getStats).not.toHaveBeenCalled()
    })
  })
})
