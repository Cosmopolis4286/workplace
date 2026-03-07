import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { EmployeeRole } from '@prisma/client'

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!restaurant) throw new ForbiddenException('El usuario no tiene un restaurante asociado')
    return restaurant.id
  }

  private async assertOwnership(employeeId: string, commerceId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    if (employee.commerceId !== commerceId) throw new ForbiddenException('Acceso denegado')
    return employee
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getRestaurantId(userId)

    const [total, active, byRoleRaw] = await Promise.all([
      this.prisma.employee.count({ where: { commerceId } }),
      this.prisma.employee.count({ where: { commerceId, isActive: true } }),
      this.prisma.employee.groupBy({
        by: ['role'],
        where: { commerceId },
        _count: { role: true },
      }),
    ])

    const byRole = Object.fromEntries(
      byRoleRaw.map((r) => [r.role, r._count.role]),
    ) as Record<EmployeeRole, number>

    return { total, active, byRole }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    const commerceId = await this.getRestaurantId(userId)
    return this.prisma.employee.findMany({
      where: { commerceId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  async findOne(userId: string, employeeId: string) {
    const commerceId = await this.getRestaurantId(userId)
    return this.assertOwnership(employeeId, commerceId)
  }

  async create(userId: string, dto: CreateEmployeeDto) {
    const commerceId = await this.getRestaurantId(userId)

    if (dto.email) {
      const exists = await this.prisma.employee.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      })
      if (exists) throw new ConflictException('Ya existe un empleado con ese correo electrónico')
    }

    return this.prisma.employee.create({
      data: { ...dto, commerceId },
    })
  }

  async update(userId: string, employeeId: string, dto: UpdateEmployeeDto) {
    const commerceId = await this.getRestaurantId(userId)
    await this.assertOwnership(employeeId, commerceId)

    if (dto.email) {
      const exists = await this.prisma.employee.findUnique({
        where: { email_commerceId: { email: dto.email, commerceId } },
      })
      if (exists && exists.id !== employeeId)
        throw new ConflictException('Ya existe un empleado con ese correo electrónico')
    }

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: dto,
    })
  }

  async remove(userId: string, employeeId: string) {
    const commerceId = await this.getRestaurantId(userId)
    await this.assertOwnership(employeeId, commerceId)
    await this.prisma.employee.delete({ where: { id: employeeId } })
  }

  async toggleStatus(userId: string, employeeId: string) {
    const commerceId = await this.getRestaurantId(userId)
    const employee = await this.assertOwnership(employeeId, commerceId)
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: !employee.isActive },
    })
  }
}
