import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (dto.entityType !== 'GENERAL' && !dto.entityId) {
      throw new ForbiddenException(
        'entityId es requerido para reportar un pedido o solicitud específica',
      );
    }
    if (dto.entityId) {
      await this.assertInvolved(reporterId, dto.entityType, dto.entityId);
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        reason: dto.reason,
        description: dto.description,
      },
    });

    this.notifications
      .notifyReportFiled(dto.entityType, dto.reason)
      .catch(() => {});

    return report;
  }

  async listMine(reporterId: string) {
    return this.prisma.report.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Moderación ─────────────────────────────────────────────────────────────

  async listAll(status?: string) {
    return this.prisma.report.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, username: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async moderate(id: string, dto: ModerateReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    return this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
        resolvedAt: ['RESOLVED', 'DISMISSED'].includes(dto.status)
          ? new Date()
          : null,
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Solo quien participó en la transacción puede reportarla (no cualquiera)
  private async assertInvolved(
    userId: string,
    entityType: string,
    entityId: string,
  ) {
    if (entityType === 'CATALOG_ORDER') {
      const order = await this.prisma.catalogOrder.findUnique({
        where: { id: entityId },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: order.commerceId },
        select: { userId: true },
      });
      if (order.requesterId !== userId && restaurant?.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para reportar este pedido');
      }
      return;
    }

    if (entityType === 'SERVICE_REQUEST') {
      const req = await this.prisma.serviceRequest.findUnique({
        where: { id: entityId },
      });
      if (!req) throw new NotFoundException('Solicitud no encontrada');
      if (req.requesterId !== userId && req.providerId !== userId) {
        throw new ForbiddenException('No tienes permiso para reportar esta solicitud');
      }
      return;
    }

    if (entityType === 'ORDER') {
      const order = await this.prisma.order.findUnique({
        where: { id: entityId },
        include: { commerce: { select: { userId: true } } },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');

      // El cliente de un Order no tiene FK a User; se verifica por email,
      // igual que OrdersService.getMyOrders() ya hace para listar "mis pedidos".
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const isCustomer =
        !!user?.email &&
        !!order.customerEmail &&
        order.customerEmail.toLowerCase() === user.email.toLowerCase();

      if (!isCustomer && order.commerce.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para reportar este pedido');
      }
      return;
    }
  }
}
