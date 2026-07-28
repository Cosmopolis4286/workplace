import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { AppointmentStatus } from '@prisma/client';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Si no tiene restaurante, usar el userId como commerceId
    return restaurant?.id ?? userId;
  }

  private async assertOwnership(appointmentId: string, commerceId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException(this.i18n.t('appointments.not_found'));
    if (appointment.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return appointment;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [total, todayTotal, confirmed, pending, cancelled, noShow] =
      await Promise.all([
        this.prisma.appointment.count({ where: { commerceId } }),
        this.prisma.appointment.count({
          where: { commerceId, date: { gte: todayStart, lte: todayEnd } },
        }),
        this.prisma.appointment.count({
          where: { commerceId, status: AppointmentStatus.CONFIRMED },
        }),
        this.prisma.appointment.count({
          where: { commerceId, status: AppointmentStatus.PENDING },
        }),
        this.prisma.appointment.count({
          where: { commerceId, status: AppointmentStatus.CANCELLED },
        }),
        this.prisma.appointment.count({
          where: { commerceId, status: AppointmentStatus.NO_SHOW },
        }),
      ]);

    return { total, todayTotal, confirmed, pending, cancelled, noShow };
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryAppointmentsDto) {
    const commerceId = await this.getCommerceId(userId);
    const { status, dateFrom, dateTo, page = 1, limit = 50 } = query;

    const where: Record<string, unknown> = { commerceId };

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom)
        (where.date as Record<string, unknown>).gte = startOfDay(
          new Date(dateFrom)
        );
      if (dateTo)
        (where.date as Record<string, unknown>).lte = endOfDay(
          new Date(dateTo)
        );
    }

    const [items, count] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, segment: true } },
        },
        orderBy: { date: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total: count, page, limit };
  }

  async findOne(userId: string, appointmentId: string) {
    const commerceId = await this.getCommerceId(userId);
    const appointment = await this.assertOwnership(appointmentId, commerceId);
    return this.prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, segment: true },
        },
      },
    });
  }

  async create(userId: string, dto: CreateAppointmentDto) {
    const commerceId = await this.getCommerceId(userId);

    // Validate customer belongs to restaurant if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || customer.commerceId !== commerceId)
        throw new BadRequestException(this.i18n.t('appointments.customer_not_found'));
    }

    return this.prisma.appointment.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        commerceId,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, segment: true },
        },
      },
    });
  }

  async update(
    userId: string,
    appointmentId: string,
    dto: UpdateAppointmentDto
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(appointmentId, commerceId);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || customer.commerceId !== commerceId)
        throw new BadRequestException(this.i18n.t('appointments.customer_not_found'));
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, segment: true },
        },
      },
    });
  }

  async remove(userId: string, appointmentId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(appointmentId, commerceId);
    await this.prisma.appointment.delete({ where: { id: appointmentId } });
  }

  async updateStatus(
    userId: string,
    appointmentId: string,
    status: AppointmentStatus
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertOwnership(appointmentId, commerceId);
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, segment: true } },
      },
    });
  }
}
