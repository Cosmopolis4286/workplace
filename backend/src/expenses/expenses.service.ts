import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { QueryExpensesDto } from './dto/query-expenses.dto'
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto'
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto'
import { ExpenseStatus } from '@prisma/client'

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(restaurantId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      currentMonth,
      prevMonth,
      byStatus,
      byCategory,
      totalBudget,
    ] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { restaurantId, date: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { restaurantId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['status'],
        where: { restaurantId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { restaurantId, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.expenseCategory.aggregate({
        where: { restaurantId },
        _sum: { budget: true },
      }),
    ])

    const statusMap = Object.fromEntries(
      byStatus.map(s => [s.status, { amount: s._sum.amount ?? 0, count: s._count }]),
    )

    const totalMonthly = currentMonth._sum.amount ?? 0
    const totalPrev = prevMonth._sum.amount ?? 0
    const changeVsPrev = totalPrev > 0
      ? ((totalMonthly - totalPrev) / totalPrev) * 100
      : 0

    const pendingAmount = statusMap['PENDIENTE']?.amount ?? 0
    const paidAmount = statusMap['PAGADO']?.amount ?? 0
    const overdueAmount = statusMap['VENCIDO']?.amount ?? 0
    const totalBudgetAmount = totalBudget._sum.budget ?? 0
    const budgetUsed = totalBudgetAmount > 0 ? (totalMonthly / totalBudgetAmount) * 100 : 0
    const dailyAvg = now.getDate() > 0 ? totalMonthly / now.getDate() : 0

    return {
      totalMonthly,
      totalPrevMonth: totalPrev,
      changeVsPrev: Math.round(changeVsPrev * 10) / 10,
      pendingAmount,
      paidAmount,
      overdueAmount,
      totalCount: currentMonth._count,
      budgetTotal: totalBudgetAmount,
      budgetUsed: Math.round(budgetUsed * 10) / 10,
      dailyAverage: Math.round(dailyAvg * 100) / 100,
    }
  }

  // ── Expenses CRUD ──────────────────────────────────────────────────────────

  async findAll(restaurantId: string, query: QueryExpensesDto) {
    const {
      status, type, categoryId, search,
      dateFrom, dateTo,
      page = 1, limit = 20,
    } = query

    const where: any = { restaurantId }
    if (status) where.status = status
    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId
    if (search) where.description = { contains: search, mode: 'insensitive' }
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59')
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string, restaurantId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, restaurantId },
      include: { category: true },
    })
    if (!expense) throw new NotFoundException('Gasto no encontrado')
    return expense
  }

  async create(restaurantId: string, dto: CreateExpenseDto) {
    if (dto.categoryId) {
      const cat = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      })
      if (!cat) throw new NotFoundException('Categoría no encontrada')
    }

    return this.prisma.expense.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        restaurantId,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async update(id: string, restaurantId: string, dto: UpdateExpenseDto) {
    await this.findOne(id, restaurantId)

    if (dto.categoryId) {
      const cat = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      })
      if (!cat) throw new NotFoundException('Categoría no encontrada')
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async updateStatus(id: string, restaurantId: string, status: ExpenseStatus) {
    await this.findOne(id, restaurantId)
    return this.prisma.expense.update({ where: { id }, data: { status } })
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId)
    await this.prisma.expense.delete({ where: { id } })
    return { message: 'Gasto eliminado correctamente' }
  }

  // ── Categories CRUD ────────────────────────────────────────────────────────

  async findAllCategories(restaurantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { restaurantId },
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(restaurantId: string, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { name: dto.name, restaurantId },
    })
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre')

    return this.prisma.expenseCategory.create({
      data: { ...dto, restaurantId },
    })
  }

  async updateCategory(id: string, restaurantId: string, dto: UpdateExpenseCategoryDto) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, restaurantId } })
    if (!cat) throw new NotFoundException('Categoría no encontrada')

    if (dto.name && dto.name !== cat.name) {
      const existing = await this.prisma.expenseCategory.findFirst({
        where: { name: dto.name, restaurantId },
      })
      if (existing) throw new ConflictException('Ya existe una categoría con ese nombre')
    }

    return this.prisma.expenseCategory.update({ where: { id }, data: dto })
  }

  async removeCategory(id: string, restaurantId: string) {
    const cat = await this.prisma.expenseCategory.findFirst({
      where: { id, restaurantId },
      include: { _count: { select: { expenses: true } } },
    })
    if (!cat) throw new NotFoundException('Categoría no encontrada')
    if (cat._count.expenses > 0) {
      throw new ConflictException(
        `No se puede eliminar: la categoría tiene ${cat._count.expenses} gasto(s) asociado(s)`,
      )
    }
    await this.prisma.expenseCategory.delete({ where: { id } })
    return { message: 'Categoría eliminada correctamente' }
  }
}
