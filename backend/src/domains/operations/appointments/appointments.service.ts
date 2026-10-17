import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
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

// Ventana de bloqueo por mesa: dos citas no pueden solaparse dentro de este
// margen (ej. mesa a las 8pm bloquea 6pm–10pm). No hay campo de duración en
// el modelo, así que se usa una ventana fija en vez de calcular fin real.
const TABLE_OVERLAP_WINDOW_MS = 2 * 60 * 60 * 1000;
const TABLE_BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.SEATED,
];

// Transiciones válidas, mismo criterio que OrdersService/ServicesService:
// evita reabrir una cita cancelada o completar una que nunca fue confirmada.
const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  CONFIRMED: [
    AppointmentStatus.SEATED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  SEATED: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly i18n: I18nService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  private async assertOwnership(appointmentId: string, commerceId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment)
      throw new NotFoundException(this.i18n.t('appointments.not_found'));
    if (appointment.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return appointment;
  }

  // Rechaza si la mesa ya tiene otra cita activa dentro de la ventana de
  // solapamiento. Sin tableNumber no aplica (uso genérico sin mesas).
  private async assertNoTableOverlap(
    commerceId: string,
    tableNumber: number | null | undefined,
    date: Date,
    excludeAppointmentId?: string
  ) {
    if (tableNumber == null) return;
    const windowStart = new Date(date.getTime() - TABLE_OVERLAP_WINDOW_MS);
    const windowEnd = new Date(date.getTime() + TABLE_OVERLAP_WINDOW_MS);

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        commerceId,
        tableNumber,
        status: { in: TABLE_BLOCKING_STATUSES },
        date: { gte: windowStart, lte: windowEnd },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
    });
    if (conflict)
      throw new BadRequestException(this.i18n.t('appointments.table_overlap'));
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

    // Validate customer belongs to commerce if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || customer.commerceId !== commerceId)
        throw new BadRequestException(
          this.i18n.t('appointments.customer_not_found')
        );
    }

    const date = new Date(dto.date);
    await this.assertNoTableOverlap(commerceId, dto.tableNumber, date);

    return this.prisma.appointment.create({
      data: {
        ...dto,
        date,
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
    const existing = await this.assertOwnership(appointmentId, commerceId);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || customer.commerceId !== commerceId)
        throw new BadRequestException(
          this.i18n.t('appointments.customer_not_found')
        );
    }

    const effectiveTableNumber =
      dto.tableNumber !== undefined ? dto.tableNumber : existing.tableNumber;
    const effectiveDate = dto.date ? new Date(dto.date) : existing.date;
    if (dto.tableNumber !== undefined || dto.date !== undefined) {
      await this.assertNoTableOverlap(
        commerceId,
        effectiveTableNumber,
        effectiveDate,
        appointmentId
      );
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
    const existing = await this.assertOwnership(appointmentId, commerceId);

    if (
      existing.status !== status &&
      !STATUS_TRANSITIONS[existing.status].includes(status)
    ) {
      throw new BadRequestException(
        this.i18n.t('appointments.invalid_status_transition')
      );
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, segment: true } },
      },
    });
  }
}
