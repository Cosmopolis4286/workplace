import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { QueryAppointmentsDto } from './dto/query-appointments.dto'
import { AppointmentStatus } from '@prisma/client'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

@Injectable()
export class AppointmentsService {
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

  private async assertOwnership(appointmentId: string, restaurantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    })
    if (!appointment) throw new NotFoundException('Agendamiento no encontrado')
    if (appointment.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return appointment
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const [total, todayTotal, confirmed, pending, cancelled, noShow] = await Promise.all([
      this.prisma.appointment.count({ where: { restaurantId } }),
      this.prisma.appointment.count({
        where: { restaurantId, date: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.appointment.count({
        where: { restaurantId, status: AppointmentStatus.CONFIRMADA },
      }),
      this.prisma.appointment.count({
        where: { restaurantId, status: AppointmentStatus.PENDIENTE },
      }),
      this.prisma.appointment.count({
        where: { restaurantId, status: AppointmentStatus.CANCELADA },
      }),
      this.prisma.appointment.count({
        where: { restaurantId, status: AppointmentStatus.NO_SHOW },
      }),
    ])

    return { total, todayTotal, confirmed, pending, cancelled, noShow }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryAppointmentsDto) {
    const restaurantId = await this.getRestaurantId(userId)
    const { status, dateFrom, dateTo, page = 1, limit = 50 } = query

    const where: Record<string, unknown> = { restaurantId }

    if (status) where.status = status

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = startOfDay(new Date(dateFrom))
      if (dateTo) (where.date as Record<string, unknown>).lte = endOfDay(new Date(dateTo))
    }

    const [items, count] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: { customer: { select: { id: true, name: true, segment: true } } },
        orderBy: { date: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ])

    return { items, total: count, page, limit }
  }

  async findOne(userId: string, appointmentId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const appointment = await this.assertOwnership(appointmentId, restaurantId)
    return this.prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: { customer: { select: { id: true, name: true, phone: true, segment: true } } },
    })
  }

  async create(userId: string, dto: CreateAppointmentDto) {
    const restaurantId = await this.getRestaurantId(userId)

    // Validate customer belongs to restaurant if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } })
      if (!customer || customer.restaurantId !== restaurantId)
        throw new BadRequestException('Cliente no encontrado en este restaurante')
    }

    return this.prisma.appointment.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        restaurantId,
      },
      include: { customer: { select: { id: true, name: true, phone: true, segment: true } } },
    })
  }

  async update(userId: string, appointmentId: string, dto: UpdateAppointmentDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertOwnership(appointmentId, restaurantId)

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } })
      if (!customer || customer.restaurantId !== restaurantId)
        throw new BadRequestException('Cliente no encontrado en este restaurante')
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
      include: { customer: { select: { id: true, name: true, phone: true, segment: true } } },
    })
  }

  async remove(userId: string, appointmentId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertOwnership(appointmentId, restaurantId)
    await this.prisma.appointment.delete({ where: { id: appointmentId } })
  }

  async updateStatus(userId: string, appointmentId: string, status: AppointmentStatus) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertOwnership(appointmentId, restaurantId)
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: { customer: { select: { id: true, name: true, segment: true } } },
    })
  }
}
