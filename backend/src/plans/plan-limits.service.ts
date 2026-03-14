import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '@prisma/client'

// All modules that exist in the system (match Permission.module values in seed)
export const ALL_MODULES = [
  'dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments',
  'delivery', 'expenses', 'analytics', 'reports', 'sales', 'employees',
  'branches', 'settings', 'notifications', 'services', 'service_requests', 'catalog',
] as const

export type AppModule = typeof ALL_MODULES[number]

export interface PlanLimits {
  maxProducts: number
  maxEmployees: number
  maxBranches: number
  maxOrders: number    // per month, -1 = unlimited
  maxStorage: number
  enabledModules: string[]
  planName: string
}

const UNLIMITED_LIMITS: PlanLimits = {
  maxProducts: -1, maxEmployees: -1, maxBranches: -1, maxOrders: -1,
  maxStorage: -1, enabledModules: [...ALL_MODULES], planName: 'Sin límite',
}

// Free-tier fallback when no active subscription exists
const FREE_LIMITS: PlanLimits = {
  maxProducts: 10,
  maxEmployees: 1,
  maxBranches: 1,
  maxOrders: 30,
  maxStorage: 0,
  enabledModules: ['dashboard', 'menu', 'orders', 'customers', 'settings', 'notifications'],
  planName: 'Sin plan',
}

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role === Role.SUPERADMIN || user?.role === Role.ADMIN || user?.role === Role.NORMAL) {
      return UNLIMITED_LIMITS
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!sub) return FREE_LIMITS

    const { plan } = sub
    return {
      maxProducts: plan.maxProducts,
      maxEmployees: plan.maxEmployees,
      maxBranches: plan.maxBranches,
      maxOrders: plan.maxOrders,
      maxStorage: plan.maxStorage,
      enabledModules: plan.enabledModules,
      planName: plan.name,
    }
  }

  hasModule(limits: PlanLimits, module: string): boolean {
    return limits.enabledModules.includes(module)
  }

  async assertModuleAccess(userId: string, module: string) {
    const limits = await this.getPlanLimits(userId)
    if (!this.hasModule(limits, module)) {
      throw new ForbiddenException(
        `El módulo "${module}" no está incluido en tu plan "${limits.planName}". Actualiza tu plan para acceder.`,
      )
    }
  }

  async assertProductLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId)
    if (limits.maxProducts === -1) return
    const count = await this.prisma.product.count({ where: { commerceId } })
    if (count >= limits.maxProducts) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxProducts} productos de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`,
      )
    }
  }

  async assertEmployeeLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId)
    if (limits.maxEmployees === -1) return
    if (limits.maxEmployees === 0) {
      throw new ForbiddenException(`Tu plan "${limits.planName}" no incluye gestión de empleados.`)
    }
    const count = await this.prisma.employee.count({ where: { commerceId } })
    if (count >= limits.maxEmployees) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxEmployees} empleados de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`,
      )
    }
  }

  async assertBranchLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId)
    if (limits.maxBranches === -1) return
    if (limits.maxBranches === 0) {
      throw new ForbiddenException(`Tu plan "${limits.planName}" no incluye gestión de sucursales.`)
    }
    const count = await this.prisma.branch.count({ where: { commerceId } })
    if (count >= limits.maxBranches) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxBranches} sucursales de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`,
      )
    }
  }

  async assertOrderLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId)
    if (limits.maxOrders === -1) return
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const count = await this.prisma.order.count({
      where: { commerceId, createdAt: { gte: startOfMonth } },
    })
    if (count >= limits.maxOrders) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxOrders} pedidos mensuales de tu plan "${limits.planName}". Actualiza tu plan para continuar.`,
      )
    }
  }

  async getUsage(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [products, employees, branches, ordersThisMonth] = await Promise.all([
      this.prisma.product.count({ where: { commerceId } }),
      this.prisma.employee.count({ where: { commerceId } }),
      this.prisma.branch.count({ where: { commerceId } }),
      this.prisma.order.count({ where: { commerceId, createdAt: { gte: startOfMonth } } }),
    ])

    return {
      limits,
      usage: { products, employees, branches, ordersThisMonth },
    }
  }
}
