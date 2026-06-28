import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceStatus, ServiceEventType, Prisma, Role } from '@prisma/client';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServicesDto, ServiceSortBy } from './dto/query-services.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformFeesService } from '../platform-fees/platform-fees.service';

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  priceUnit: true,
  duration: true,
  image: true,
  status: true,
  tags: true,
  modalities: true,
  itemFields: true,
  createdAt: true,
  category: { select: { id: true, name: true, color: true, icon: true } },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      avatar: true,
      country: true,
      state: true,
      city: true,
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
      reviewsReceived: { select: { rating: true } },
    },
  },
};

function attachRating<T extends { user: { reviewsReceived: { rating: number }[], [k: string]: any }, [k: string]: any }>(item: T) {
  const reviews = item.user.reviewsReceived;
  const rating = reviews.length
    ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
    : null;
  const reviewsCount = reviews.length;
  const { reviewsReceived: _, ...userWithoutReviews } = item.user;
  return { ...item, user: { ...userWithoutReviews, rating, reviewsCount } };
}

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private platformFees: PlatformFeesService
  ) {}

  // ─── Catalog (public) ─────────────────────────────────────────────────────

  async getCatalogCategories() {
    const cats = await this.prisma.serviceCategory.findMany({
      where: { services: { some: { status: ServiceStatus.ACTIVO } } },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        _count: {
          select: { services: { where: { status: ServiceStatus.ACTIVO } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return {
      data: cats.map((c) => ({
        ...c,
        serviceCount: c._count.services,
        _count: undefined,
      })),
    };
  }

  async getCatalogProviders() {
    const users = await this.prisma.user.findMany({
      where: { services: { some: { status: ServiceStatus.ACTIVO } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        _count: {
          select: { services: { where: { status: ServiceStatus.ACTIVO } } },
        },
      },
    });
    return {
      data: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        username: u.username,
        avatar: u.avatar,
        category: u.category?.name ?? null,
        subcategory: u.subcategory?.name ?? null,
        serviceCount: u._count.services,
      })),
    };
  }

  async getCatalogServices(dto: QueryServicesDto) {
    const page = Math.max(1, parseInt(dto.page ?? '1'));
    const limit = Math.min(48, Math.max(1, parseInt(dto.limit ?? '16')));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = { status: ServiceStatus.ACTIVO };

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { tags: { has: dto.search.toLowerCase() } },
      ];
    }
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.userId) where.userId = dto.userId;

    let orderBy: Prisma.ServiceOrderByWithRelationInput = { createdAt: 'desc' };
    if (dto.sort === ServiceSortBy.PRICE_ASC) orderBy = { price: 'asc' };
    else if (dto.sort === ServiceSortBy.PRICE_DESC) orderBy = { price: 'desc' };
    else if (dto.sort === ServiceSortBy.NAME) orderBy = { name: 'asc' };

    if (dto.city || dto.state || dto.country) {
      return this.getCatalogServicesNearMe(where, dto, page, limit, orderBy);
    }

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: SERVICE_SELECT,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data: data.map(attachRating), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Filtra servicios por ubicación del proveedor con fallback en cascada:
   * ciudad exacta → estado → país.
   */
  private async getCatalogServicesNearMe(
    baseWhere: Prisma.ServiceWhereInput,
    dto: QueryServicesDto,
    page: number,
    limit: number,
    orderBy: Prisma.ServiceOrderByWithRelationInput
  ) {
    const skip = (page - 1) * limit;
    const tiers: { tier: 'city' | 'state' | 'country'; user: Prisma.UserWhereInput }[] = [];
    if (dto.city) tiers.push({ tier: 'city', user: { city: { equals: dto.city, mode: 'insensitive' } } });
    if (dto.state) tiers.push({ tier: 'state', user: { state: { equals: dto.state, mode: 'insensitive' } } });
    if (dto.country) tiers.push({ tier: 'country', user: { country: { equals: dto.country, mode: 'insensitive' } } });

    for (const { tier, user } of tiers) {
      const where: Prisma.ServiceWhereInput = { ...baseWhere, user };
      const [data, total] = await Promise.all([
        this.prisma.service.findMany({ where, select: SERVICE_SELECT, skip, take: limit, orderBy }),
        this.prisma.service.count({ where }),
      ]);
      if (total > 0) {
        return { data: data.map(attachRating), total, page, limit, totalPages: Math.ceil(total / limit), locationTier: tier };
      }
    }

    return { data: [], total: 0, page, limit, totalPages: 0, locationTier: null };
  }

  async getCatalogServiceById(id: string) {
    const s = await this.prisma.service.findFirst({
      where: { id, status: ServiceStatus.ACTIVO },
      select: SERVICE_SELECT,
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return attachRating(s);
  }

  // ─── My Services (authenticated) ─────────────────────────────────────────

  async getMyServices(userId: string, dto: QueryServicesDto) {
    const page = Math.max(1, parseInt(dto.page ?? '1'));
    const limit = Math.min(48, Math.max(1, parseInt(dto.limit ?? '16')));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = { userId };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: SERVICE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createService(userId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: { ...dto, userId },
      select: SERVICE_SELECT,
    });
  }

  async updateService(id: string, userId: string, dto: UpdateServiceDto) {
    await this.assertOwner(id, userId);
    return this.prisma.service.update({
      where: { id },
      data: dto,
      select: SERVICE_SELECT,
    });
  }

  async deleteService(id: string, userId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.service.delete({ where: { id } });
  }

  async toggleStatus(id: string, userId: string) {
    const s = await this.assertOwner(id, userId);
    const next =
      s.status === ServiceStatus.ACTIVO
        ? ServiceStatus.PAUSADO
        : ServiceStatus.ACTIVO;
    return this.prisma.service.update({
      where: { id },
      data: { status: next },
      select: SERVICE_SELECT,
    });
  }

  // ─── Categories (admin) ───────────────────────────────────────────────────

  async getCategories() {
    return this.prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: Partial<CreateServiceCategoryDto>) {
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.prisma.serviceCategory.delete({ where: { id } });
  }

  // ─── Modalities (admin) ───────────────────────────────────────────────────

  async getModalities() {
    return this.prisma.serviceModality.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAllModalities() {
    return this.prisma.serviceModality.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createModality(dto: { name: string; value: string; emoji?: string; sortOrder?: number }) {
    return this.prisma.serviceModality.create({
      data: {
        name: dto.name,
        value: dto.value,
        emoji: dto.emoji,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateModality(id: string, dto: Partial<{ name: string; value: string; emoji: string; sortOrder: number; isActive: boolean }>) {
    return this.prisma.serviceModality.update({
      where: { id },
      data: dto,
    });
  }

  async deleteModality(id: string) {
    await this.prisma.serviceModality.delete({ where: { id } });
  }

  // ─── Service Requests ─────────────────────────────────────────────────────

  // Estados que cuentan como "trato abierto": el proveedor todavía no resolvió la solicitud.
  private static readonly OPEN_REQUEST_STATUSES = ['PENDIENTE', 'VISTO', 'CONTACTADO'];

  async createServiceRequest(
    dto: CreateServiceRequestDto,
    requesterId?: string
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, userId: true, status: true },
    });
    if (!service || service.status !== ServiceStatus.ACTIVO) {
      throw new NotFoundException('El servicio no existe o ya no está disponible');
    }
    if (service.userId !== dto.providerId) {
      throw new BadRequestException('El proveedor no coincide con el dueño del servicio');
    }
    if (requesterId && requesterId === dto.providerId) {
      throw new BadRequestException('No puedes solicitar tu propio servicio');
    }

    // Evita que el mismo cliente le abra varias solicitudes seguidas al mismo proveedor
    // para el mismo servicio mientras ya tiene una en curso sin resolver.
    const duplicateWhere: Prisma.ServiceRequestWhereInput = {
      serviceId: dto.serviceId,
      providerId: dto.providerId,
      status: { in: ServicesService.OPEN_REQUEST_STATUSES as any },
      ...(requesterId ? { requesterId } : { clientPhone: dto.clientPhone }),
    };
    const existingOpen = await this.prisma.serviceRequest.findFirst({ where: duplicateWhere });
    if (existingOpen) {
      throw new BadRequestException(
        'Ya tienes una solicitud en curso para este servicio con este proveedor. Espera a que el proveedor responda antes de enviar otra.'
      );
    }

    // Anti-spam: tope de solicitudes nuevas (a cualquier proveedor) en una ventana corta,
    // tanto para usuarios autenticados como anónimos (identificados por teléfono).
    const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
    const RATE_LIMIT_MAX = 5;
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await this.prisma.serviceRequest.count({
      where: {
        createdAt: { gte: windowStart },
        ...(requesterId ? { requesterId } : { clientPhone: dto.clientPhone }),
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      throw new BadRequestException(
        'Has enviado demasiadas solicitudes en poco tiempo. Espera unos minutos antes de intentar de nuevo.'
      );
    }

    const preferredDate = new Date(dto.preferredDate);
    if (dto.preferredTime) {
      const [hours, minutes] = dto.preferredTime.split(':').map(Number);
      preferredDate.setHours(hours, minutes, 0, 0);
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        serviceId: dto.serviceId,
        serviceName: dto.serviceName,
        providerId: dto.providerId,
        providerName: dto.providerName,
        modality: dto.modality ?? 'CUALQUIERA',
        preferredDate,
        address: dto.address,
        city: dto.city,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail,
        description: dto.description,
        price: dto.price,
        priceUnit: dto.priceUnit,
        requesterId: requesterId ?? null,
        items: dto.items?.length
          ? {
              create: dto.items.map((item, i) => ({
                fields: item.fields ?? {},
                notes: item.notes,
                photos: item.photos ?? [],
                videos: item.videos ?? [],
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
    // Fire-and-forget notification to the provider
    this.notifications
      .notifyNewServiceRequest(dto.providerId, dto.clientName, dto.serviceName)
      .catch(() => {});
    return request;
  }

  async getMyServiceRequests(userId: string, page = 1, limit = 20, asRole: 'provider' | 'client' = 'provider') {
    const skip = (page - 1) * limit;
    const where = asRole === 'client'
      ? { requesterId: userId }
      : { providerId: userId };
    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return { data: await this.withAvatars(data), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // providerId/requesterId no tienen FK formal a User en este modelo (providerId
  // es de un Service ajeno al dueño autenticado), así que el avatar se resuelve
  // en batch en memoria en lugar de vía include/relation de Prisma.
  private async withAvatars<T extends { providerId: string; requesterId: string | null }>(
    requests: T[]
  ): Promise<(T & { providerAvatar: string | null; clientAvatar: string | null })[]> {
    const userIds = [...new Set(requests.flatMap((r) => [r.providerId, r.requesterId].filter((id): id is string => !!id)))];
    if (userIds.length === 0) return requests.map((r) => ({ ...r, providerAvatar: null, clientAvatar: null }));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, avatar: true },
    });
    const avatarById = new Map(users.map((u) => [u.id, u.avatar]));

    return requests.map((r) => ({
      ...r,
      providerAvatar: avatarById.get(r.providerId) ?? null,
      clientAvatar: r.requesterId ? avatarById.get(r.requesterId) ?? null : null,
    }));
  }

  // Autoriza y resuelve el filename de un archivo de media de una solicitud de servicio.
  // El archivo solo puede ser visto por el cliente, el proveedor de esa solicitud, o un admin/superadmin.
  async authorizeRequestMedia(filename: string, userId: string, userRole: Role) {
    const relativePath = `/uploads/service-requests/${filename}`;
    const item = await this.prisma.serviceRequestItem.findFirst({
      where: { OR: [{ photos: { has: relativePath } }, { videos: { has: relativePath } }] },
      select: { serviceRequest: { select: { providerId: true, requesterId: true } } },
    });
    if (!item) throw new NotFoundException('Archivo no encontrado');

    const isAdmin = userRole === Role.SUPERADMIN || userRole === Role.ADMIN;
    const { providerId, requesterId } = item.serviceRequest;
    if (!isAdmin && providerId !== userId && requesterId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este archivo');
    }
  }

  async getServiceRequest(id: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId)
      throw new ForbiddenException('No tienes permiso');

    const [withAvatar] = await this.withAvatars([req]);

    // Sugerencia de precio para el proveedor: solo tiene sentido antes de cerrar el trato.
    if (req.providerId === userId && !req.price && ['PENDIENTE', 'VISTO'].includes(req.status)) {
      const suggestion = await this.getSuggestedPrice(req.serviceId, req.providerId);
      return { ...withAvatar, ...suggestion };
    }

    return withAvatar;
  }

  // Promedio del precio realmente acordado en tratos cerrados anteriores para este
  // mismo servicio y proveedor — más útil que el precio de lista (Service.price),
  // que es estático y no refleja lo que de verdad se negoció.
  async getSuggestedPrice(serviceId: string, providerId: string) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: { serviceId, providerId, status: 'CERRADO', price: { not: null } },
      select: { price: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (closed.length === 0) return { suggestedPrice: null, suggestedPriceBasedOn: 0 };
    const sum = closed.reduce((acc, r) => acc + (r.price ?? 0), 0);
    return {
      suggestedPrice: Math.round(sum / closed.length),
      suggestedPriceBasedOn: closed.length,
    };
  }

  // Transiciones válidas: el flujo solo avanza, nunca retrocede, y CERRADO/CANCELADO son terminales.
  // PENDIENTE puede saltar directo a CONTACTADO (el proveedor llamó sin pasar por "visto" en la app).
  // CANCELADO solo es alcanzable desde PENDIENTE/VISTO (el cliente cancela antes de que el
  // proveedor invierta tiempo en contactarlo); no se puede cancelar desde CONTACTADO/CERRADO.
  private static readonly VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDIENTE: ['VISTO', 'CONTACTADO', 'CERRADO', 'CANCELADO'],
    VISTO: ['CONTACTADO', 'CERRADO', 'CANCELADO'],
    CONTACTADO: ['CERRADO'],
    CERRADO: [],
    CANCELADO: [],
  };

  private static readonly TERMINAL_STATUSES = ['CERRADO', 'CANCELADO'];

  private assertValidStatusTransition(from: string, to: string) {
    // Un estado terminal no admite ningún cambio, ni siquiera a sí mismo: evita que
    // un doble-click reintente acciones (y sus efectos secundarios, ej. notificaciones).
    if (ServicesService.TERMINAL_STATUSES.includes(from)) {
      throw new ForbiddenException(`No puedes cambiar el estado de ${from} a ${to}`);
    }
    if (from === to) return;
    const allowed = ServicesService.VALID_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ForbiddenException(
        `No puedes cambiar el estado de ${from} a ${to}`,
      );
    }
  }

  async updateServiceRequest(id: string, userId: string, data: { status?: string; providerNotes?: string; price?: number; priceUnit?: string }) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId)
      throw new ForbiddenException('No tienes permiso');
    const update: any = {};
    if (data.status !== undefined) {
      this.assertValidStatusTransition(req.status, data.status);
      update.status = data.status;
      update.statusUpdatedAt = new Date();
    }
    if (data.providerNotes !== undefined) update.providerNotes = data.providerNotes;
    if (data.priceUnit !== undefined) update.priceUnit = data.priceUnit;

    if (data.price !== undefined) {
      const feeConfig = await this.platformFees.resolveFeeConfig('SERVICE_REQUEST', req.providerId);
      if (feeConfig?.payer === 'CLIENT') {
        const { feeAmount } = this.platformFees.calculateFee(data.price, feeConfig);
        update.price = data.price + feeAmount;
        update.platformFeeRate = feeConfig.rate;
        update.platformFeeAmount = feeAmount;
        update.platformFeePayer = 'CLIENT';
      } else {
        update.price = data.price;
      }
    }

    const updated = await this.prisma.serviceRequest.update({ where: { id }, data: update });

    if (data.status !== undefined && data.status !== req.status && req.requesterId && ['VISTO', 'CONTACTADO', 'CERRADO'].includes(data.status)) {
      this.notifications
        .notifyServiceRequestStatusChanged(req.requesterId, req.providerName, req.serviceName, data.status as 'VISTO' | 'CONTACTADO' | 'CERRADO')
        .catch(() => {});

      if (data.status === 'CERRADO') {
        this.sendReviewReminder(req.requesterId, req.providerId, req.providerName).catch(() => {});
      }
    }

    return updated;
  }

  // Empuja al cliente a dejar una reseña verificada apenas se cierra el trato,
  // en vez de depender de que la descubra por su cuenta al visitar el perfil.
  private async sendReviewReminder(clientId: string, providerId: string, providerName: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: { username: true },
    });
    return this.notifications.notifyReviewReminder(clientId, providerName, provider?.username);
  }

  async updateServiceRequestStatus(id: string, userId: string, status: string) {
    return this.updateServiceRequest(id, userId, { status });
  }

  // El cliente (requester) confirma que el servicio se completó realmente.
  // Solo desde CONTACTADO, para evitar que se cierre algo que nunca avanzó,
  // y habilita la reseña verificada del proveedor.
  async confirmServiceRequestCompletion(id: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.requesterId !== userId)
      throw new ForbiddenException('No tienes permiso');
    if (req.status !== 'CONTACTADO')
      throw new ForbiddenException(
        'Solo puedes confirmar una solicitud que ya fue contactada por el proveedor',
      );

    const update: any = { status: 'CERRADO', statusUpdatedAt: new Date() };

    if (!req.platformFeePayer && req.price) {
      const feeConfig = await this.platformFees.resolveFeeConfig('SERVICE_REQUEST', req.providerId);
      if (feeConfig?.payer === 'PROVIDER') {
        const { feeAmount } = this.platformFees.calculateFee(req.price, feeConfig);
        await this.platformFees.chargeProviderFee(
          'SERVICE_REQUEST',
          req.providerId,
          feeAmount,
          `FEE-SVC-${id}`,
          { serviceRequestId: id },
        );
        update.platformFeeRate = feeConfig.rate;
        update.platformFeeAmount = feeAmount;
        update.platformFeePayer = 'PROVIDER';
      }
    }

    const updated = await this.prisma.serviceRequest.update({ where: { id }, data: update });

    this.sendReviewReminder(userId, req.providerId, req.providerName).catch(() => {});

    return updated;
  }

  // El cliente (requester) cancela su propia solicitud antes de que el proveedor
  // invierta tiempo contactándolo. Solo válido desde PENDIENTE/VISTO.
  async cancelServiceRequest(id: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.requesterId !== userId)
      throw new ForbiddenException('No tienes permiso');
    this.assertValidStatusTransition(req.status, 'CANCELADO');

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'CANCELADO', statusUpdatedAt: new Date() },
    });

    this.notifications
      .notifyServiceRequestCancelled(req.providerId, req.clientName, req.serviceName)
      .catch(() => {});

    return updated;
  }

  // ─── Tracking & Metrics ───────────────────────────────────────────────────

  async trackEvent(
    serviceId: string,
    type: ServiceEventType,
    viewerId?: string,
    sessionId?: string
  ) {
    // Verify service exists (silently skip if not)
    const exists = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, userId: true },
    });
    if (!exists) return;
    // No trackear eventos del propio dueño
    if (viewerId && exists.userId === viewerId) return;

    // Deduplicación: solo 1 evento del mismo tipo por ventana de 1h
    // Para usuarios autenticados: deduplicar por viewerId
    // Para anónimos: deduplicar por sessionId (guardado en campo viewerId con prefijo "s:")
    const dedupeKey = viewerId ?? (sessionId ? `s:${sessionId}` : null);
    if (dedupeKey) {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hora
      const recent = await this.prisma.serviceEvent.findFirst({
        where: {
          serviceId,
          type,
          viewerId: dedupeKey,
          createdAt: { gte: windowStart },
        },
        select: { id: true },
      });
      if (recent) return; // ya registrado en esta ventana
    }

    await this.prisma.serviceEvent.create({
      data: { serviceId, type, viewerId: dedupeKey ?? null },
    });
  }

  async getServiceMetrics(id: string, userId: string) {
    await this.assertOwner(id, userId);

    const now = new Date();
    const days7ago  = new Date(now.getTime() - 7  * 86400_000);
    const days30ago = new Date(now.getTime() - 30 * 86400_000);
    const days14ago = new Date(now.getTime() - 14 * 86400_000);

    const [
      views, profileVisits, requests,
      viewsLast7, viewsPrev7,
      requestsLast30, recentViewEvents,
      lastRequest,
    ] = await Promise.all([
      // Totales históricos
      this.prisma.serviceEvent.count({ where: { serviceId: id, type: ServiceEventType.VIEW } }),
      this.prisma.serviceEvent.count({ where: { serviceId: id, type: ServiceEventType.PROFILE_VISIT } }),
      this.prisma.serviceEvent.count({ where: { serviceId: id, type: ServiceEventType.REQUEST } }),
      // Vistas últimos 7 días vs 7 días anteriores (para tendencia)
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.VIEW, createdAt: { gte: days7ago } },
      }),
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.VIEW, createdAt: { gte: days14ago, lt: days7ago } },
      }),
      // Solicitudes últimos 30 días
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.REQUEST, createdAt: { gte: days30ago } },
      }),
      // Eventos de vista recientes para gráfico por día
      this.prisma.serviceEvent.findMany({
        where: { serviceId: id, type: ServiceEventType.VIEW, createdAt: { gte: days7ago } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Última solicitud recibida
      this.prisma.serviceRequest.findFirst({
        where: { serviceId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, clientName: true, modality: true },
      }),
    ]);

    // Gráfico: 7 días con conteo por día
    const viewsByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      viewsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const ev of recentViewEvents) {
      const day = ev.createdAt.toISOString().slice(0, 10);
      if (day in viewsByDay) viewsByDay[day]++;
    }

    // Tendencia de vistas: variación % respecto a los 7 días anteriores
    const viewsTrend = viewsPrev7 > 0
      ? Math.round(((viewsLast7 - viewsPrev7) / viewsPrev7) * 100)
      : viewsLast7 > 0 ? 100 : 0;

    const conversionRate = views > 0 ? Math.round((requests / views) * 100) : 0;
    // Tasa de interés: visitas al perfil / vistas totales
    const interestRate   = views > 0 ? Math.round((profileVisits / views) * 100) : 0;
    // Alcance estimado: vistas únicas aproximadas (últimos 7 días)
    const weeklyReach = viewsLast7;

    return {
      views,
      profileVisits,
      requests,
      conversionRate,
      interestRate,
      weeklyReach,
      viewsTrend,
      requestsLast30,
      lastRequest: lastRequest
        ? {
            date: lastRequest.createdAt,
            clientName: lastRequest.clientName,
            modality: lastRequest.modality,
          }
        : null,
      viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({ date, count })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertOwner(id: string, userId: string) {
    const s = await this.prisma.service.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    if (s.userId !== userId)
      throw new ForbiddenException(
        'No tienes permiso para modificar este servicio'
      );
    return s;
  }
}
