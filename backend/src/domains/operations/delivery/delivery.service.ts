import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { round } from '../../../common/money/money';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { TelegramService } from '../../engagement/telegram/telegram.service';
import { MailService } from '../../engagement/mail/mail.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { InviteDriverDto } from './dto/invite-driver.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-delivery.dto';
import {
  DeliveryStatus,
  DriverStatus,
  DriverInvitationStatus,
  KycStatus,
  DeliveryCollection,
} from '@prisma/client';
import {
  ReputationFacade,
  REPUTATION_FACADE,
} from '../../reputation/reputation.facade';
import { TrackingService } from './tracking/tracking.service';
import { TrackingGateway } from './tracking/tracking.gateway';

const DRIVER_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const LEGACY_DRIVER_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Avances que puede hacer el repartidor desde su app (nunca hacia atrás ni
// cancelar: eso lo decide el comercio).
const DRIVER_TRANSITIONS: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKING_UP, DeliveryStatus.FAILED],
  [DeliveryStatus.PICKING_UP]: [
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.FAILED,
  ],
  [DeliveryStatus.IN_TRANSIT]: [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
  ],
};

/** Código de 4 dígitos que el cliente le da al repartidor al recibir. */
export function generateDeliveryCode(): string {
  return String(randomInt(0, 10000)).padStart(4, '0');
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
    private readonly mail: MailService,
    private readonly i18n: I18nService,
    @Inject(REPUTATION_FACADE) private readonly reputation: ReputationFacade,
    private readonly tracking: TrackingService,
    private readonly trackingGateway: TrackingGateway
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  private async assertDriverOwnership(driverId: string, commerceId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver)
      throw new NotFoundException(this.i18n.t('delivery.driver.not_found'));
    if (driver.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return driver;
  }

  // Un driver solo puede recibir una nueva asignación si: (a) ya tiene cuenta
  // propia con KYC aprobado, o (b) todavía está dentro de su periodo de
  // gracia como driver legado sin cuenta (ver LEGACY_DRIVER_GRACE_MS).
  private async assertDriverAssignable(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!driver)
      throw new NotFoundException(this.i18n.t('delivery.driver.not_found'));

    if (driver.userId) {
      if (driver.user?.kycStatus !== KycStatus.APPROVED) {
        throw new ForbiddenException(
          this.i18n.t('delivery.driver.kyc_required')
        );
      }
      return driver;
    }

    if (driver.graceUntil && driver.graceUntil < new Date()) {
      throw new ForbiddenException(
        this.i18n.t('delivery.driver.grace_expired')
      );
    }

    return driver;
  }

  private async assertDeliveryOwnership(
    deliveryId: string,
    commerceId: string
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery)
      throw new NotFoundException(this.i18n.t('delivery.delivery.not_found'));
    if (delivery.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return delivery;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      activeDeliveries,
      todayDeliveries,
      totalDrivers,
      onlineDrivers,
      deliveredToday,
      pendingDeliveries,
      cancelledToday,
    ] = await Promise.all([
      this.prisma.delivery.count({
        where: {
          commerceId,
          status: {
            in: [
              DeliveryStatus.ASSIGNED,
              DeliveryStatus.PICKING_UP,
              DeliveryStatus.IN_TRANSIT,
            ],
          },
        },
      }),
      this.prisma.delivery.count({
        where: { commerceId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.driver.count({ where: { commerceId, isActive: true } }),
      this.prisma.driver.count({
        where: { commerceId, isActive: true, status: DriverStatus.AVAILABLE },
      }),
      this.prisma.delivery.count({
        where: {
          commerceId,
          status: DeliveryStatus.DELIVERED,
          deliveredAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.delivery.count({
        where: { commerceId, status: DeliveryStatus.PENDING },
      }),
      this.prisma.delivery.count({
        where: {
          commerceId,
          status: DeliveryStatus.CANCELLED,
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    // Average delivery time for today's completed deliveries
    const completedToday = await this.prisma.delivery.findMany({
      where: {
        commerceId,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: { gte: todayStart, lte: todayEnd },
        pickedUpAt: { not: null },
      },
      select: { pickedUpAt: true, deliveredAt: true },
    });

    let avgDeliveryTime = 0;
    if (completedToday.length > 0) {
      const totalMinutes = completedToday.reduce((sum, d) => {
        const mins =
          (d.deliveredAt!.getTime() - d.pickedUpAt!.getTime()) / 60000;
        return sum + mins;
      }, 0);
      avgDeliveryTime = Math.round(totalMinutes / completedToday.length);
    }

    return {
      activeDeliveries,
      todayDeliveries,
      totalDrivers,
      onlineDrivers,
      deliveredToday,
      pendingDeliveries,
      cancelledToday,
      avgDeliveryTime,
    };
  }

  // ─── Drivers CRUD ─────────────────────────────────────────────────────────

  async findAllDrivers(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    const drivers = await this.prisma.driver.findMany({
      where: { commerceId, isActive: true },
      include: {
        user: { select: { kycStatus: true } },
        _count: {
          select: {
            deliveries: {
              where: {
                createdAt: {
                  gte: startOfDay(new Date()),
                  lte: endOfDay(new Date()),
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    return drivers.map((d) => ({
      ...d,
      isAssignable: d.userId
        ? d.user?.kycStatus === KycStatus.APPROVED
        : !d.graceUntil || d.graceUntil >= now,
    }));
  }

  // Alta directa sin cuenta propia — solo por compatibilidad hacia atrás.
  // El driver resultante queda en periodo de gracia (ver LEGACY_DRIVER_GRACE_MS)
  // y no podrá recibir nuevas asignaciones una vez vencido si no se vincula a
  // una cuenta con KYC aprobado (ver assertDriverAssignable). El flujo nuevo
  // recomendado es inviteDriver().
  async createDriver(userId: string, dto: CreateDriverDto) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.driver.create({
      data: {
        ...dto,
        commerceId,
        graceUntil: new Date(Date.now() + LEGACY_DRIVER_GRACE_MS),
      },
    });
  }

  // ─── Invitaciones de repartidor ───────────────────────────────────────────

  async listInvitations(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.driverInvitation.findMany({
      where: { commerceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Endpoint público: contexto mínimo para la página de aceptación antes de
  // pedir login/registro. No expone email/teléfono de la invitación.
  async previewInvitation(token: string) {
    const invitation = await this.prisma.driverInvitation.findUnique({
      where: { token },
      include: { commerce: { select: { name: true } } },
    });
    if (!invitation)
      throw new NotFoundException(this.i18n.t('delivery.invitation.not_found'));

    const isExpired =
      invitation.status === DriverInvitationStatus.EXPIRED ||
      (invitation.status === DriverInvitationStatus.PENDING &&
        invitation.expiresAt < new Date());

    return {
      commerceName: invitation.commerce.name,
      status: isExpired ? DriverInvitationStatus.EXPIRED : invitation.status,
    };
  }

  async inviteDriver(userId: string, dto: InviteDriverDto) {
    const commerceId = await this.getCommerceId(userId);

    const existingPending = await this.prisma.driverInvitation.findFirst({
      where: {
        commerceId,
        email: dto.email,
        status: DriverInvitationStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        this.i18n.t('delivery.invitation.already_pending')
      );
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { id: commerceId },
      select: { name: true },
    });

    const invitation = await this.prisma.driverInvitation.create({
      data: {
        token: uuidv4(),
        commerceId,
        email: dto.email,
        phone: dto.phone,
        name: dto.name,
        expiresAt: new Date(Date.now() + DRIVER_INVITATION_TTL_MS),
      },
    });

    this.mail
      .sendDriverInvitation(
        dto.email,
        commerce?.name ?? 'Un comercio',
        invitation.token
      )
      .catch(() => null);

    return invitation;
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const commerceId = await this.getCommerceId(userId);
    const invitation = await this.prisma.driverInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.commerceId !== commerceId) {
      throw new NotFoundException(this.i18n.t('delivery.invitation.not_found'));
    }
    if (invitation.status !== DriverInvitationStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('delivery.invitation.no_longer_pending')
      );
    }
    return this.prisma.driverInvitation.update({
      where: { id: invitationId },
      data: { status: DriverInvitationStatus.CANCELLED },
    });
  }

  // El repartidor invitado, ya autenticado con su propia cuenta, "reclama"
  // la invitación con el token. Se crea el Driver vinculado a su userId —
  // sin periodo de gracia, porque nace ya con cuenta propia.
  async acceptInvitation(token: string, acceptingUserId: string) {
    const invitation = await this.prisma.driverInvitation.findUnique({
      where: { token },
    });
    if (!invitation)
      throw new NotFoundException(this.i18n.t('delivery.invitation.not_found'));
    if (invitation.status !== DriverInvitationStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('delivery.invitation.no_longer_available')
      );
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.driverInvitation.update({
        where: { id: invitation.id },
        data: { status: DriverInvitationStatus.EXPIRED },
      });
      throw new BadRequestException(this.i18n.t('delivery.invitation.expired'));
    }

    const existingDriverProfile = await this.prisma.driver.findUnique({
      where: { userId: acceptingUserId },
    });
    if (existingDriverProfile) {
      throw new BadRequestException(
        this.i18n.t('delivery.invitation.already_linked')
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: acceptingUserId },
      select: { firstName: true, lastName: true, phone: true },
    });
    if (!user)
      throw new NotFoundException(
        this.i18n.t('delivery.invitation.user_not_found')
      );

    const [driver] = await this.prisma.$transaction([
      this.prisma.driver.create({
        data: {
          name: invitation.name || `${user.firstName} ${user.lastName}`.trim(),
          phone: invitation.phone || user.phone || undefined,
          commerceId: invitation.commerceId,
          userId: acceptingUserId,
        },
      }),
      this.prisma.driverInvitation.update({
        where: { id: invitation.id },
        data: {
          status: DriverInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      }),
    ]);

    this.notifications
      .notifyDriverInvitationAccepted(invitation.commerceId, driver.name)
      .catch(() => null);

    return driver;
  }

  async updateDriver(userId: string, driverId: string, dto: UpdateDriverDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDriverOwnership(driverId, commerceId);
    return this.prisma.driver.update({ where: { id: driverId }, data: dto });
  }

  async removeDriver(userId: string, driverId: string) {
    const commerceId = await this.getCommerceId(userId);
    const driver = await this.assertDriverOwnership(driverId, commerceId);
    // Soft delete: mark as inactive
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: false, status: DriverStatus.INACTIVE },
    });
  }

  async updateDriverStatus(
    userId: string,
    driverId: string,
    status: DriverStatus
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDriverOwnership(driverId, commerceId);
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });
  }

  // ─── Deliveries CRUD ──────────────────────────────────────────────────────

  async findAllDeliveries(userId: string, query: QueryDeliveriesDto) {
    const commerceId = await this.getCommerceId(userId);
    const { status, driverId, dateFrom, dateTo, page = 1, limit = 50 } = query;

    const where: Record<string, unknown> = { commerceId };
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom)
        (where.createdAt as Record<string, unknown>).gte = startOfDay(
          new Date(dateFrom)
        );
      if (dateTo)
        (where.createdAt as Record<string, unknown>).lte = endOfDay(
          new Date(dateTo)
        );
    }

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              vehicleType: true,
              vehicleModel: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOneDelivery(userId: string, deliveryId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDeliveryOwnership(deliveryId, commerceId);
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { driver: true },
    });
  }

  private async resolveCustomerUserId(email: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'No hay una cuenta de WorkPlace con ese correo. Deja el campo vacío si el cliente no tiene cuenta.'
      );
    }
    return user.id;
  }

  async createDelivery(userId: string, dto: CreateDeliveryDto) {
    const commerceId = await this.getCommerceId(userId);

    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver || driver.commerceId !== commerceId)
        throw new BadRequestException(
          this.i18n.t('delivery.driver.not_found_in_commerce')
        );
      await this.assertDriverAssignable(dto.driverId);
    }

    // El comercio identifica al cliente por el correo de su cuenta (nadie
    // conoce un id interno). Con cuenta, el cliente sigue la entrega, recibe
    // los avisos y habla con el repartidor por chat en vez de por teléfono.
    const { customerEmail, ...data } = dto;
    if (customerEmail && !data.customerUserId) {
      data.customerUserId = await this.resolveCustomerUserId(customerEmail);
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        ...data,
        commerceId,
        status: dto.status ?? DeliveryStatus.PENDING,
        deliveryCode: generateDeliveryCode(),
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            vehicleModel: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    // If driver assigned, update driver status to ON_DELIVERY
    if (dto.driverId && delivery.status !== DeliveryStatus.DELIVERED) {
      await this.prisma.driver.update({
        where: { id: dto.driverId },
        data: { status: DriverStatus.ON_DELIVERY },
      });
    }

    return delivery;
  }

  async updateDelivery(
    userId: string,
    deliveryId: string,
    dto: UpdateDeliveryDto
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDeliveryOwnership(deliveryId, commerceId);

    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver || driver.commerceId !== commerceId)
        throw new BadRequestException(
          this.i18n.t('delivery.driver.not_found_in_commerce')
        );
      await this.assertDriverAssignable(dto.driverId);
    }

    const { customerEmail, ...data } = dto;
    if (customerEmail && !data.customerUserId) {
      data.customerUserId = await this.resolveCustomerUserId(customerEmail);
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            vehicleModel: true,
            phone: true,
            status: true,
          },
        },
      },
    });
  }

  async removeDelivery(userId: string, deliveryId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDeliveryOwnership(deliveryId, commerceId);
    await this.prisma.delivery.delete({ where: { id: deliveryId } });
  }

  async updateDeliveryStatus(
    userId: string,
    deliveryId: string,
    status: DeliveryStatus
  ) {
    const commerceId = await this.getCommerceId(userId);
    const delivery = await this.assertDeliveryOwnership(deliveryId, commerceId);
    return this.applyStatus(delivery, commerceId, status);
  }

  /**
   * El repartidor asignado avanza su entrega desde "Mis entregas". Solo hacia
   * adelante (ASSIGNED → PICKING_UP → IN_TRANSIT → DELIVERED | FAILED).
   * Entregar exige el código del cliente (prueba de entrega) y registra lo
   * cobrado; fallar exige un motivo. El comercio conserva su propio camino
   * (updateDeliveryStatus) para corregir o cerrar sin código.
   */
  async driverUpdateStatus(
    userId: string,
    deliveryId: string,
    dto: {
      status: DeliveryStatus;
      deliveryCode?: string;
      failureReason?: string;
      amountCollected?: number;
      collectedMethod?: DeliveryCollection;
    }
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || !driver || delivery.driverId !== driver.id) {
      throw new NotFoundException('Entrega no encontrada');
    }
    const allowed = DRIVER_TRANSITIONS[delivery.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        'No puedes pasar la entrega a ese estado desde el estado actual'
      );
    }

    const extra: Record<string, unknown> = {};
    if (dto.status === DeliveryStatus.DELIVERED) {
      if (
        delivery.deliveryCode &&
        (dto.deliveryCode ?? '').trim() !== delivery.deliveryCode
      ) {
        throw new BadRequestException(
          'El código de entrega no coincide. Pídeselo al cliente.'
        );
      }
      if (!dto.collectedMethod) {
        throw new BadRequestException(
          'Indica cómo se pagó el pedido (efectivo, transferencia o ya pagado)'
        );
      }
      const collected =
        dto.collectedMethod === DeliveryCollection.PREPAID
          ? 0
          : (dto.amountCollected ?? -1);
      if (collected < 0) {
        throw new BadRequestException('Indica cuánto cobraste al entregar');
      }
      extra.collectedMethod = dto.collectedMethod;
      extra.amountCollected = round(collected);
    }
    if (dto.status === DeliveryStatus.FAILED) {
      const reason = dto.failureReason?.trim() ?? '';
      if (reason.length < 5) {
        throw new BadRequestException(
          'Explica por qué no se pudo entregar (mínimo 5 caracteres)'
        );
      }
      extra.failureReason = reason.slice(0, 300);
    }
    const updated = await this.applyStatus(
      delivery,
      delivery.commerceId,
      dto.status,
      extra
    );
    // Igual que en "Mis entregas": el repartidor nunca recibe el código.
    const { deliveryCode, ...rest } = updated;
    return { ...rest, hasDeliveryCode: !!deliveryCode };
  }

  // Cambio de estado común al comercio y al repartidor: fechas, liberar al
  // repartidor, reputación, tracking en vivo y avisos.
  private async applyStatus(
    delivery: {
      id: string;
      driverId: string | null;
      pickedUpAt: Date | null;
      orderNumber: string;
      customerPhone: string | null;
      deliveryCode?: string | null;
    },
    commerceId: string,
    status: DeliveryStatus,
    extra: Record<string, unknown> = {}
  ) {
    const deliveryId = delivery.id;
    const data: Record<string, unknown> = { status, ...extra };

    if (
      status === DeliveryStatus.PICKING_UP ||
      status === DeliveryStatus.IN_TRANSIT
    ) {
      data.pickedUpAt = data.pickedUpAt ?? delivery.pickedUpAt ?? new Date();
    }
    if (status === DeliveryStatus.DELIVERED) {
      data.deliveredAt = new Date();
      // Free the driver
      if (delivery.driverId) {
        await this.prisma.driver.update({
          where: { id: delivery.driverId },
          data: {
            status: DriverStatus.AVAILABLE,
            totalDeliveries: { increment: 1 },
          },
        });
      }
    }
    if (
      status === DeliveryStatus.CANCELLED ||
      status === DeliveryStatus.FAILED
    ) {
      // Free the driver
      if (delivery.driverId) {
        await this.prisma.driver.update({
          where: { id: delivery.driverId },
          data: { status: DriverStatus.AVAILABLE },
        });
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            vehicleModel: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (
      delivery.driverId &&
      (status === DeliveryStatus.DELIVERED ||
        status === DeliveryStatus.CANCELLED ||
        status === DeliveryStatus.FAILED)
    ) {
      this.reputation.recalculate('DRIVER', delivery.driverId).catch(() => {});
    }

    const trackingActive = await this.tracking.syncTrackingActive(
      deliveryId,
      status
    );
    this.trackingGateway.emitStatusUpdate(deliveryId, status, trackingActive);

    this.notifications
      .notifyDeliveryStatusChange(commerceId, delivery.orderNumber, status)
      .catch(() => null);

    // El cliente con cuenta se entera de cada paso (antes solo el comercio).
    if (updated.customerUserId) {
      this.prisma.commerce
        .findUnique({ where: { id: commerceId }, select: { name: true } })
        .then((commerce) =>
          this.notifications.notifyCustomerDeliveryStatus(
            updated.customerUserId!,
            {
              deliveryId,
              orderNumber: delivery.orderNumber,
              commerceName: commerce?.name ?? 'el comercio',
              status,
              failureReason: updated.failureReason,
            }
          )
        )
        .catch(() => null);
    }

    if (delivery.customerPhone) {
      const customer = await this.prisma.customer.findFirst({
        where: { phone: delivery.customerPhone, commerceId },
        select: { id: true, telegramChatId: true },
      });
      if (customer?.telegramChatId) {
        const statusEmoji: Record<string, string> = {
          ASSIGNED: '🔔 Asignado a repartidor',
          PICKING_UP: '🏃 Repartidor en camino a recoger',
          IN_TRANSIT: '🚚 Tu pedido va en camino',
          DELIVERED: '🎉 ¡Pedido entregado!',
          CANCELLED: '❌ Entrega cancelada',
          FAILED: '⚠️ Entrega fallida — contáctanos',
        };
        const label = statusEmoji[status] ?? status;
        // Al salir el pedido, el cliente recibe el código que le dará al
        // repartidor al recibir (prueba de entrega).
        const codeLine =
          delivery.deliveryCode &&
          (status === DeliveryStatus.ASSIGNED ||
            status === DeliveryStatus.IN_TRANSIT)
            ? `\nCódigo de entrega: <b>${delivery.deliveryCode}</b> (dáselo al repartidor al recibir)`
            : '';
        this.telegram
          .sendMessage(
            customer.telegramChatId,
            `📦 <b>Entrega #${delivery.orderNumber}</b>\n${label}${codeLine}`
          )
          .catch(() => null);
      }
    }

    return updated;
  }

  async assignDriver(userId: string, deliveryId: string, driverId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertDeliveryOwnership(deliveryId, commerceId);

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver || driver.commerceId !== commerceId)
      throw new BadRequestException(
        this.i18n.t('delivery.driver.not_found_in_commerce')
      );
    if (!driver.isActive)
      throw new BadRequestException(this.i18n.t('delivery.driver.not_active'));
    await this.assertDriverAssignable(driverId);

    const [delivery] = await Promise.all([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { driverId, status: DeliveryStatus.ASSIGNED },
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              vehicleType: true,
              vehicleModel: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_DELIVERY },
      }),
    ]);

    const trackingActive = await this.tracking.syncTrackingActive(
      deliveryId,
      DeliveryStatus.ASSIGNED
    );
    this.trackingGateway.emitStatusUpdate(
      deliveryId,
      DeliveryStatus.ASSIGNED,
      trackingActive
    );

    return delivery;
  }
}
