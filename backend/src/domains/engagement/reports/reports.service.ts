import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReputationFacade, REPUTATION_FACADE } from '../../reputation/reputation.facade';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(REPUTATION_FACADE) private reputation: ReputationFacade,
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

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
        resolvedAt: ['RESOLVED', 'DISMISSED'].includes(dto.status)
          ? new Date()
          : null,
      },
    });

    // El disputeRate del score se calcula sobre reportes PENDING/IN_REVIEW/
    // RESOLVED de la entidad — cualquier cambio de status (incluido
    // DISMISSED, que sale de ese conjunto) puede mover el score.
    if (report.entityId) {
      await this.recalculateReputationForReport(report.entityType, report.entityId);
    }

    return updated;
  }

  private async recalculateReputationForReport(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    if (entityType === 'ORDER') {
      const order = await this.prisma.order.findUnique({
        where: { id: entityId },
        select: { commerceId: true },
      });
      if (order) this.reputation.recalculate('COMMERCE', order.commerceId).catch(() => {});
      return;
    }
    if (entityType === 'SERVICE_REQUEST') {
      const req = await this.prisma.serviceRequest.findUnique({
        where: { id: entityId },
        select: { providerId: true },
      });
      if (req) this.reputation.recalculate('PROFESSIONAL', req.providerId).catch(() => {});
    }
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
      const commerce = await this.prisma.commerce.findUnique({
        where: { id: order.commerceId },
        select: { userId: true },
      });
      if (order.requesterId !== userId && commerce?.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para reportar este pedido');
      }
      return;
    }

    if (entityType === 'SERVICE') {
      // A diferencia de SERVICE_REQUEST/ORDER, un Service es un anuncio
      // público en el catálogo — cualquier usuario autenticado puede
      // reportarlo (ej. sospecha de fraude) sin haberlo contratado antes.
      // Solo se verifica que exista.
      const service = await this.prisma.service.findUnique({ where: { id: entityId } });
      if (!service) throw new NotFoundException('Servicio no encontrado');
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
