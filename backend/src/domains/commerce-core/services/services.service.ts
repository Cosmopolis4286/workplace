import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ServiceStatus, ServiceEventType, Prisma, Role } from '@prisma/client';
import { features } from '../../../common/config/features';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServicesDto, ServiceSortBy } from './dto/query-services.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { CreatePriceChangeProposalDto } from './dto/create-price-change-proposal.dto';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import {
  PlatformFeesFacade,
  PLATFORM_FEES_FACADE,
} from '../../money/platform-fees/platform-fees.facade';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../money/plans/plan-limits.facade';
import { InsufficientEscrowFundsError } from '../../money/wallets/wallet.errors';
import { EscrowFacade, ESCROW_FACADE } from '../../money/escrow/escrow.facade';
import {
  ReputationFacade,
  REPUTATION_FACADE,
} from '../../reputation/reputation.facade';
import { CategoryScopeService } from '../../../common/category-scope/category-scope.service';
import {
  normalizeTags,
  tagSearchCondition,
} from '../../../common/utils/tags.util';
import { fetchImageFromUrlSafely } from '../../../common/utils/safe-url-image-fetch.util';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  add,
  div,
  gt,
  isPositive,
  sub,
  sum,
  toDecimal,
  toNumber,
  type MoneyInput,
} from '../../../common/money/money';

// Plazo del cliente para confirmar o disputar después de que el proveedor
// marca el trabajo terminado; luego se cierra solo.
export const AUTO_CLOSE_AFTER_MS = 72 * 60 * 60 * 1000;
// Plazo para pagar una garantía pendiente (Pago Protegido por operación).
export const GUARANTEE_PAYMENT_WINDOW_MS = 72 * 60 * 60 * 1000;

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  priceUnit: true,
  duration: true,
  images: true,
  status: true,
  hasEscrow: true,
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

function attachRating<
  T extends {
    user: { reviewsReceived: { rating: number }[]; [k: string]: any };
    [k: string]: any;
  },
>(item: T) {
  const reviews = item.user.reviewsReceived;
  const rating = reviews.length
    ? Number(
        (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2)
      )
    : null;
  const reviewsCount = reviews.length;
  const { reviewsReceived: _, ...userWithoutReviews } = item.user;
  return { ...item, user: { ...userWithoutReviews, rating, reviewsCount } };
}

// Toda la conversación entre cliente y proveedor se hace por el chat de la
// solicitud: el proveedor nunca recibe el teléfono ni el correo del cliente.
// La dirección del servicio solo se muestra cuando el proveedor ya aceptó
// (CONTACTED en adelante), porque la necesita para hacer el trabajo.
// Antes recibía todo desde que entraba la solicitud y podía cerrar el trato
// por fuera (rechazándola en la app) sin que la plataforma participara.
const ADDRESS_HIDDEN_STATUSES = ['PENDING', 'SEEN', 'REJECTED', 'CANCELLED'];

export function withClientContactForViewer<
  T extends {
    providerId: string;
    status: string;
    clientPhone: string | null;
    clientEmail: string | null;
    address: string | null;
  },
>(req: T, viewerId: string | null): T & { contactHidden: boolean } {
  if (viewerId !== req.providerId) return { ...req, contactHidden: false };
  return {
    ...req,
    clientPhone: null,
    clientEmail: null,
    address: ADDRESS_HIDDEN_STATUSES.includes(req.status) ? null : req.address,
    contactHidden: true,
  };
}

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(PLATFORM_FEES_FACADE) private platformFees: PlatformFeesFacade,
    @Inject(PLAN_LIMITS_FACADE) private planLimits: PlanLimitsFacade,
    @Inject(ESCROW_FACADE) private escrow: EscrowFacade,
    @Inject(REPUTATION_FACADE) private reputation: ReputationFacade,
    private readonly categoryScope: CategoryScopeService
  ) {}

  // ─── Catalog (public) ─────────────────────────────────────────────────────

  // `forCreation`: dos casos de uso distintos comparten este endpoint.
  // - false (default, catálogo de búsqueda pública): solo categorías con al
  //   menos un servicio ACTIVE — no tiene sentido ofrecer un filtro vacío.
  // - true (selector del formulario "Nuevo Servicio"): sin ese filtro, para
  //   no atraparse en un cold-start (una categoría recién habilitada para un
  //   rubro nunca aparecería hasta que alguien publicara el primer servicio
  //   ahí) — en su lugar se filtra por CategoryScopeService al rubro del
  //   usuario, que es la restricción que sí aplica al publicar.
  async getCatalogCategories(
    user?: { id: string; role: Role },
    forCreation = false
  ) {
    const userCategoryId =
      forCreation &&
      user &&
      user.role !== Role.SUPERADMIN &&
      user.role !== Role.ADMIN
        ? await this.categoryScope.getUserCategoryId(user.id)
        : null;

    const cats = await this.prisma.serviceCategory.findMany({
      where: forCreation
        ? undefined
        : { services: { some: { status: ServiceStatus.ACTIVE } } },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        userCategoryIds: true,
        _count: {
          select: { services: { where: { status: ServiceStatus.ACTIVE } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const scoped =
      forCreation &&
      user &&
      user.role !== Role.SUPERADMIN &&
      user.role !== Role.ADMIN
        ? this.categoryScope.filterByCategory(cats, userCategoryId)
        : cats;

    return {
      data: scoped.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        serviceCount: c._count.services,
      })),
    };
  }

  // Top tags reales (por frecuencia) entre servicios activos, opcionalmente
  // filtrados por substring `q` para autocompletado. Se trae solo la columna
  // `tags` y se cuenta en memoria: evita mantener una tabla maestra aparte.
  async getPopularTags(
    q?: string,
    limit = 20
  ): Promise<{ tag: string; count: number }[]> {
    const services = await this.prisma.service.findMany({
      where: { status: ServiceStatus.ACTIVE },
      select: { tags: true },
    });
    const counts = new Map<string, number>();
    for (const s of services) {
      for (const tag of s.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const query = q?.trim().toLowerCase();
    return Array.from(counts.entries())
      .filter(([tag]) => !query || tag.includes(query))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  async getCatalogProviders(page = 1, limit = 24) {
    limit = Math.min(48, Math.max(1, limit));
    const skip = (page - 1) * limit;
    const where = { services: { some: { status: ServiceStatus.ACTIVE } } };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
          category: { select: { name: true } },
          subcategory: { select: { name: true } },
          _count: {
            select: { services: { where: { status: ServiceStatus.ACTIVE } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCatalogServices(dto: QueryServicesDto) {
    const page = Math.max(1, parseInt(dto.page ?? '1'));
    const limit = Math.min(48, Math.max(1, parseInt(dto.limit ?? '16')));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = { status: ServiceStatus.ACTIVE };

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { tags: tagSearchCondition(dto.search) },
      ];
    }
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.userId) where.userId = dto.userId;
    if (dto.priceMax) where.price = { lte: parseFloat(dto.priceMax) };

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

    return {
      data: data.map(attachRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
    const tiers: {
      tier: 'city' | 'state' | 'country';
      user: Prisma.UserWhereInput;
    }[] = [];
    if (dto.city)
      tiers.push({
        tier: 'city',
        user: { city: { equals: dto.city, mode: 'insensitive' } },
      });
    if (dto.state)
      tiers.push({
        tier: 'state',
        user: { state: { equals: dto.state, mode: 'insensitive' } },
      });
    if (dto.country)
      tiers.push({
        tier: 'country',
        user: { country: { equals: dto.country, mode: 'insensitive' } },
      });

    for (const { tier, user } of tiers) {
      const where: Prisma.ServiceWhereInput = { ...baseWhere, user };
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
      if (total > 0) {
        return {
          data: data.map(attachRating),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          locationTier: tier,
        };
      }
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      locationTier: null,
    };
  }

  async getCatalogServiceById(id: string) {
    const s = await this.prisma.service.findFirst({
      where: { id, status: ServiceStatus.ACTIVE },
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
    if (dto.status) where.status = dto.status;

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

  async getMyServicesStats(userId: string) {
    const grouped = await this.prisma.service.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {
      ACTIVE: 0,
      PAUSED: 0,
      INACTIVE: 0,
    };
    for (const g of grouped) counts[g.status] = g._count._all;
    const total = counts.ACTIVE + counts.PAUSED + counts.INACTIVE;
    return {
      total,
      activos: counts.ACTIVE,
      pausados: counts.PAUSED,
      inactivos: counts.INACTIVE,
    };
  }

  // Modalidades: solo valores del catálogo activo (ServiceModality, gestionado
  // por admin). 'ANY' ("cualquiera") ya cubre a las demás, así que combinarlo
  // con otras es contradictorio y se normaliza a solo 'ANY'.
  private async normalizeModalities(
    modalities: string[] | undefined
  ): Promise<string[] | undefined> {
    if (!modalities) return undefined;
    const unique = [...new Set(modalities)];
    if (unique.length === 0) return unique;
    const active = await this.prisma.serviceModality.findMany({
      where: { isActive: true },
      select: { value: true },
    });
    const allowed = new Set(active.map((m) => m.value));
    const invalid = unique.filter((m) => !allowed.has(m));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Modalidad no disponible: ${invalid.join(', ')}`
      );
    }
    return unique.includes('ANY') ? ['ANY'] : unique;
  }

  // Sin categoría el servicio no aparece en los filtros del catálogo. Se exige
  // solo si el rubro del usuario tiene categorías disponibles: con un rubro
  // sin catálogo todavía (cold-start) no hay nada que elegir.
  private async assertCategoryChosen(
    userId: string,
    categoryId: string | undefined
  ) {
    if (categoryId) return;
    const [userCategoryId, cats] = await Promise.all([
      this.categoryScope.getUserCategoryId(userId),
      this.prisma.serviceCategory.findMany({
        select: { userCategoryIds: true },
      }),
    ]);
    if (this.categoryScope.filterByCategory(cats, userCategoryId).length > 0) {
      throw new BadRequestException(
        'Elige una categoría para que los clientes encuentren tu servicio'
      );
    }
  }

  async createService(userId: string, dto: CreateServiceDto) {
    await this.assertCategoryChosen(userId, dto.categoryId);
    const modalities = await this.normalizeModalities(dto.modalities);
    if (
      dto.status !== ServiceStatus.PAUSED &&
      dto.status !== ServiceStatus.INACTIVE
    ) {
      await this.planLimits.assertServiceLimit(userId);
    }
    return this.prisma.service.create({
      data: {
        ...dto,
        tags: normalizeTags(dto.tags) ?? [],
        ...(modalities && { modalities }),
        userId,
      },
      select: SERVICE_SELECT,
    });
  }

  async updateService(id: string, userId: string, dto: UpdateServiceDto) {
    const current = await this.assertOwner(id, userId);
    const modalities = await this.normalizeModalities(dto.modalities);
    // Reactivar por edición también consume cupo del plan (igual que toggle).
    if (
      dto.status === ServiceStatus.ACTIVE &&
      current.status !== ServiceStatus.ACTIVE
    ) {
      await this.planLimits.assertServiceLimit(userId);
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        tags: normalizeTags(dto.tags),
        ...(modalities && { modalities }),
      },
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
      s.status === ServiceStatus.ACTIVE
        ? ServiceStatus.PAUSED
        : ServiceStatus.ACTIVE;
    if (next === ServiceStatus.ACTIVE) {
      await this.planLimits.assertServiceLimit(userId);
    }
    return this.prisma.service.update({
      where: { id },
      data: { status: next },
      select: SERVICE_SELECT,
    });
  }

  // ─── Imágenes ───────────────────────────────────────────────────────────────
  // slot 0 = principal, 1-2 = secundarias. `images` es un array de largo fijo
  // 3 rellenado con '' en los huecos para que un slot se pueda reemplazar sin
  // afectar a los demás.

  private async setServiceImageSlot(
    id: string,
    slot: number,
    relativePath: string
  ) {
    const s = await this.prisma.service.findUnique({
      where: { id },
      select: { images: true },
    });
    const current = [...(s?.images ?? [])];
    while (current.length < 3) current.push('');
    current[slot] = relativePath;
    // Recorta huecos finales vacíos para no persistir slots vacíos de más.
    while (current.length > 0 && current[current.length - 1] === '')
      current.pop();
    return this.prisma.service.update({
      where: { id },
      data: { images: current },
      select: SERVICE_SELECT,
    });
  }

  async setServiceImageFromUpload(
    id: string,
    userId: string,
    slot: number,
    file: Express.Multer.File
  ) {
    await this.assertOwner(id, userId);
    return this.setServiceImageSlot(
      id,
      slot,
      `/uploads/services/${file.filename}`
    );
  }

  async importServiceImageFromUrl(
    id: string,
    userId: string,
    slot: number,
    url: string
  ) {
    await this.assertOwner(id, userId);
    const { buffer, extension } = await fetchImageFromUrlSafely(url);

    const uploadPath = join(process.cwd(), 'uploads', 'services');
    if (!existsSync(uploadPath)) await mkdir(uploadPath, { recursive: true });

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    await writeFile(join(uploadPath, filename), buffer);

    return this.setServiceImageSlot(id, slot, `/uploads/services/${filename}`);
  }

  // ─── Moderación (admin) ─────────────────────────────────────────────────────
  // A diferencia de toggleStatus (dueño, alterna ACTIVE↔PAUSED), esto lo usa
  // un admin para ocultar un servicio ajeno del catálogo — nunca deja el
  // servicio ACTIVE, y el dueño no puede reactivarlo con su propio toggle
  // (que solo alterna entre ACTIVE/PAUSED, nunca toca/sale de INACTIVE).

  async moderateService(id: string, hide: boolean) {
    const s = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!s) throw new NotFoundException('Servicio no encontrado');

    return this.prisma.service.update({
      where: { id },
      data: { status: hide ? ServiceStatus.INACTIVE : ServiceStatus.PAUSED },
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

  async createModality(dto: {
    name: string;
    value: string;
    emoji?: string;
    sortOrder?: number;
  }) {
    return this.prisma.serviceModality.create({
      data: {
        name: dto.name,
        value: dto.value,
        emoji: dto.emoji,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateModality(
    id: string,
    dto: Partial<{
      name: string;
      value: string;
      emoji: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ) {
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
  private static readonly OPEN_REQUEST_STATUSES = [
    'PENDING',
    'SEEN',
    'CONTACTED',
  ];

  async createServiceRequest(
    dto: CreateServiceRequestDto,
    requesterId: string
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, userId: true, status: true },
    });
    if (!service || service.status !== ServiceStatus.ACTIVE) {
      throw new NotFoundException(
        'El servicio no existe o ya no está disponible'
      );
    }
    if (service.userId !== dto.providerId) {
      throw new BadRequestException(
        'El proveedor no coincide con el dueño del servicio'
      );
    }
    if (requesterId === dto.providerId) {
      throw new BadRequestException('No puedes solicitar tu propio servicio');
    }

    // Evita que el mismo cliente le abra varias solicitudes seguidas al mismo proveedor
    // para el mismo servicio mientras ya tiene una en curso sin resolver.
    const duplicateWhere: Prisma.ServiceRequestWhereInput = {
      serviceId: dto.serviceId,
      providerId: dto.providerId,
      status: { in: ServicesService.OPEN_REQUEST_STATUSES as any },
      requesterId,
    };
    const existingOpen = await this.prisma.serviceRequest.findFirst({
      where: duplicateWhere,
    });
    if (existingOpen) {
      throw new BadRequestException(
        'Ya tienes una solicitud en curso para este servicio con este proveedor. Espera a que el proveedor responda antes de enviar otra.'
      );
    }

    // Anti-spam: tope de solicitudes nuevas (a cualquier proveedor) en una ventana corta.
    const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
    const RATE_LIMIT_MAX = 5;
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await this.prisma.serviceRequest.count({
      where: {
        createdAt: { gte: windowStart },
        requesterId,
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      throw new BadRequestException(
        'Has enviado demasiadas solicitudes en poco tiempo. Espera unos minutos antes de intentar de nuevo.'
      );
    }

    await this.planLimits.assertServiceRequestLimit(dto.providerId);

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
        modality: dto.modality ?? 'ANY',
        preferredDate,
        address: dto.address,
        city: dto.city,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail,
        description: dto.description,
        price: dto.price,
        priceUnit: dto.priceUnit,
        requesterId,
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

  // Resumen de solicitudes recibidas como proveedor, para el reporte de
  // negocio de un freelancer (equivalente a orderStats/expenseStats de
  // comercio, pero sobre ServiceRequest en vez de Order).
  async getMyServiceRequestsStats(providerId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, active, completedToday, cancelled, closedThisMonth] =
      await Promise.all([
        this.prisma.serviceRequest.count({ where: { providerId } }),
        this.prisma.serviceRequest.count({
          where: {
            providerId,
            status: { in: ServicesService.OPEN_REQUEST_STATUSES as any },
          },
        }),
        this.prisma.serviceRequest.count({
          where: {
            providerId,
            status: 'CLOSED',
            statusUpdatedAt: { gte: startOfToday },
          },
        }),
        this.prisma.serviceRequest.count({
          where: { providerId, status: 'CANCELLED' },
        }),
        this.prisma.serviceRequest.findMany({
          where: {
            providerId,
            status: 'CLOSED',
            statusUpdatedAt: { gte: startOfMonth },
          },
          select: { price: true },
        }),
      ]);

    const totalRevenue = toNumber(
      sum(closedThisMonth.map((r) => r.price ?? 0))
    );
    const avgTicket =
      closedThisMonth.length > 0
        ? Math.round((totalRevenue / closedThisMonth.length) * 100) / 100
        : 0;

    return {
      total,
      active,
      completedToday,
      cancelled,
      totalRevenue,
      avgTicket,
    };
  }

  async getMyServiceRequests(
    userId: string,
    page = 1,
    limit = 20,
    asRole: 'provider' | 'client' = 'provider'
  ) {
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;
    const where =
      asRole === 'client' ? { requesterId: userId } : { providerId: userId };
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
    const withAvatars = await this.withAvatars(data);
    return {
      data: withAvatars.map((r) => withClientContactForViewer(r, userId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // providerId/requesterId no tienen FK formal a User en este modelo (providerId
  // es de un Service ajeno al dueño autenticado), así que el avatar se resuelve
  // en batch en memoria en lugar de vía include/relation de Prisma.
  private async withAvatars<
    T extends { providerId: string; requesterId: string | null },
  >(
    requests: T[]
  ): Promise<
    (T & { providerAvatar: string | null; clientAvatar: string | null })[]
  > {
    const userIds = [
      ...new Set(
        requests.flatMap((r) =>
          [r.providerId, r.requesterId].filter((id): id is string => !!id)
        )
      ),
    ];
    if (userIds.length === 0)
      return requests.map((r) => ({
        ...r,
        providerAvatar: null,
        clientAvatar: null,
      }));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, avatar: true },
    });
    const avatarById = new Map(users.map((u) => [u.id, u.avatar]));

    return requests.map((r) => ({
      ...r,
      providerAvatar: avatarById.get(r.providerId) ?? null,
      clientAvatar: r.requesterId
        ? (avatarById.get(r.requesterId) ?? null)
        : null,
    }));
  }

  // Autoriza y resuelve el filename de un archivo de media de una solicitud de servicio.
  // El archivo solo puede ser visto por el cliente, el proveedor de esa solicitud, o un admin/superadmin.
  async authorizeRequestMedia(
    filename: string,
    userId: string,
    userRole: Role
  ) {
    const relativePath = `/uploads/service-requests/${filename}`;
    const item = await this.prisma.serviceRequestItem.findFirst({
      where: {
        OR: [
          { photos: { has: relativePath } },
          { videos: { has: relativePath } },
        ],
      },
      select: {
        serviceRequest: { select: { providerId: true, requesterId: true } },
      },
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

    const [avatarRow] = await this.withAvatars([req]);
    const withAvatar = withClientContactForViewer(avatarRow, userId);

    // Sugerencia de precio para el proveedor: solo tiene sentido antes de cerrar el trato.
    if (
      req.providerId === userId &&
      !isPositive(req.price) &&
      ['PENDING', 'SEEN'].includes(req.status)
    ) {
      const suggestion = await this.getSuggestedPrice(
        req.serviceId,
        req.providerId
      );
      return { ...withAvatar, ...suggestion };
    }

    return withAvatar;
  }

  // Promedio del precio realmente acordado en tratos cerrados anteriores para este
  // mismo servicio y proveedor — más útil que el precio de lista (Service.price),
  // que es estático y no refleja lo que de verdad se negoció.
  async getSuggestedPrice(serviceId: string, providerId: string) {
    const closed = await this.prisma.serviceRequest.findMany({
      where: { serviceId, providerId, status: 'CLOSED', price: { not: null } },
      select: { price: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (closed.length === 0)
      return { suggestedPrice: null, suggestedPriceBasedOn: 0 };
    const total = sum(closed.map((r) => r.price ?? 0));
    return {
      suggestedPrice: toNumber(div(total, closed.length), 0),
      suggestedPriceBasedOn: closed.length,
    };
  }

  // Transiciones válidas: el flujo solo avanza, nunca retrocede, y CLOSED/CANCELLED/REJECTED
  // son terminales. PENDING puede saltar directo a CONTACTED (el proveedor llamó sin pasar
  // por "visto" en la app). CANCELLED solo es alcanzable desde PENDING/SEEN (el cliente
  // cancela antes de que el proveedor invierta tiempo en contactarlo). REJECTED es la salida
  // del proveedor cuando no puede/quiere tomar el trabajo, también solo antes de CONTACTED.
  // CLOSED ya NO es alcanzable por el proveedor vía esta tabla — el único camino es que el
  // cliente confirme la finalización (confirmServiceRequestCompletion), que es donde se cobra
  // la comisión de plataforma; de lo contrario un proveedor podía cerrar el trato sin pagar fee.
  private static readonly VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['SEEN', 'CONTACTED', 'REJECTED', 'CANCELLED'],
    SEEN: ['CONTACTED', 'REJECTED', 'CANCELLED'],
    CONTACTED: [],
    CLOSED: [],
    CANCELLED: [],
    REJECTED: [],
  };

  private static readonly TERMINAL_STATUSES = [
    'CLOSED',
    'CANCELLED',
    'REJECTED',
  ];

  private assertValidStatusTransition(from: string, to: string) {
    // Un estado terminal no admite ningún cambio, ni siquiera a sí mismo: evita que
    // un doble-click reintente acciones (y sus efectos secundarios, ej. notificaciones).
    if (ServicesService.TERMINAL_STATUSES.includes(from)) {
      throw new ForbiddenException(
        `No puedes cambiar el estado de ${from} a ${to}`
      );
    }
    if (from === to) return;
    const allowed = ServicesService.VALID_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ForbiddenException(
        `No puedes cambiar el estado de ${from} a ${to}`
      );
    }
  }

  async updateServiceRequest(
    id: string,
    userId: string,
    data: {
      status?: string;
      providerNotes?: string;
      price?: number;
      priceUnit?: string;
    }
  ) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId)
      throw new ForbiddenException('No tienes permiso');
    const update: any = {};
    if (data.status !== undefined) {
      // CANCELLED is client-only — provider cannot cancel on behalf of the client
      if (data.status === 'CANCELLED')
        throw new ForbiddenException(
          'Solo el cliente puede cancelar una solicitud'
        );
      // CLOSED is client-only — only confirmServiceRequestCompletion can close a request,
      // so the platform fee is always charged when a deal is marked as done.
      if (data.status === 'CLOSED')
        throw new ForbiddenException(
          'Solo el cliente puede confirmar la finalización de una solicitud'
        );
      this.assertValidStatusTransition(req.status, data.status);
      update.status = data.status;
      update.statusUpdatedAt = new Date();
    }
    if (data.providerNotes !== undefined)
      update.providerNotes = data.providerNotes;
    if (data.priceUnit !== undefined) update.priceUnit = data.priceUnit;

    if (data.price !== undefined) {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'SERVICE_REQUEST',
        req.providerId
      );
      if (feeConfig?.payer === 'CLIENT') {
        const { feeAmount } = this.platformFees.calculateFee(
          data.price,
          feeConfig
        );
        update.price = data.price + feeAmount;
        update.platformFeeRate = feeConfig.rate;
        update.platformFeeAmount = feeAmount;
        update.platformFeePayer = 'CLIENT';
      } else {
        update.price = data.price;
      }

      // Retención de garantía: solo si el proveedor ofrece este servicio con
      // escrow, todavía no se retuvo nada para esta solicitud (evita
      // doble-retención si el precio se corrige más de una vez), y esta misma
      // llamada no está rechazando/cancelando la solicitud a la vez.
      const resultingStatus = update.status ?? req.status;
      const isTerminalNow =
        ServicesService.TERMINAL_STATUSES.includes(resultingStatus);
      if (req.escrowStatus === 'NONE' && !isTerminalNow) {
        const service = await this.prisma.service.findUnique({
          where: { id: req.serviceId },
          select: { hasEscrow: true },
        });
        // Pago Protegido apagado: el servicio se cobra directo, sin garantía.
        if (service?.hasEscrow && features.protectedPayments()) {
          if (!req.requesterId) {
            throw new BadRequestException(
              'Este servicio requiere garantía de plataforma; el cliente debe estar autenticado con una billetera.'
            );
          }
          try {
            await this.escrow.hold({
              entityType: 'SERVICE_REQUEST',
              entityId: id,
              payerId: req.requesterId,
              payeeId: req.providerId,
              deltaAmount: update.price,
            });
            update.escrowStatus = 'HELD';
            update.escrowAmount = update.price;
            update.escrowHeldAt = new Date();
          } catch (err) {
            // Solo el saldo insuficiente es recuperable por reintento
            // automático (hook de depósito + cron, ver 3.3b) — la solicitud
            // igual avanza (el proveedor ya fijó el precio) y queda
            // PENDING_FUNDS. Cualquier otro error (wallet inexistente,
            // congelada, suspendida) NO se puede resolver reintentando solo,
            // así que se propaga como falla real de la transición.
            if (!(err instanceof InsufficientEscrowFundsError)) throw err;
            update.escrowStatus = 'PENDING_FUNDS';
            update.escrowAmount = update.price;
            this.notifications
              .notifyEscrowFundsNeeded(
                req.requesterId,
                req.providerName,
                req.serviceName,
                update.price
              )
              .catch(() => {});
          }
        }
      }
    }

    // Reembolsa la garantía si ya estaba retenida/pendiente y esta misma
    // llamada rechaza la solicitud (edge case: precio y rechazo en un solo
    // request). En el flujo normal REJECTED solo es alcanzable desde
    // PENDING/SEEN, antes de que exista nada que retener — esto es solo
    // defensa en profundidad, no-op si no hay escrow que devolver.
    if (data.status === 'REJECTED' && req.requesterId) {
      if (update.escrowStatus === 'HELD' && update.escrowAmount) {
        await this.escrow.refund({
          entityType: 'SERVICE_REQUEST',
          entityId: id,
          payerId: req.requesterId,
          amount: update.escrowAmount,
        });
        update.escrowStatus = 'REFUNDED';
      } else if (update.escrowStatus === 'PENDING_FUNDS') {
        update.escrowStatus = 'NONE';
        update.escrowAmount = null;
      }
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: update,
    });

    if (data.status !== undefined && data.status !== req.status) {
      await this.prisma.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: id,
          previousStatus: req.status,
          newStatus: data.status as any,
          changedBy: userId,
        },
      });

      if (req.requesterId && ['SEEN', 'CONTACTED'].includes(data.status)) {
        this.notifications
          .notifyServiceRequestStatusChanged(
            req.requesterId,
            req.providerName,
            req.serviceName,
            data.status as 'SEEN' | 'CONTACTED'
          )
          .catch(() => {});
      }

      if (req.requesterId && data.status === 'REJECTED') {
        this.notifications
          .notifyServiceRequestRejected(
            req.requesterId,
            req.providerName,
            req.serviceName
          )
          .catch(() => {});
      }

      // Cualquier propuesta de aumento aún pendiente de respuesta del cliente deja de
      // tener sentido si la solicitud llega a un estado terminal — invalidarla evita
      // que el cliente apruebe un aumento sobre un trato ya cerrado/cancelado/rechazado.
      if (ServicesService.TERMINAL_STATUSES.includes(data.status)) {
        this.reputation
          .recalculate('PROFESSIONAL', req.providerId)
          .catch(() => {});

        const invalidated =
          await this.prisma.serviceRequestPriceChangeProposal.updateMany({
            where: { serviceRequestId: id, status: 'PENDING' },
            data: { status: 'INVALIDATED', resolvedAt: new Date() },
          });
        if (invalidated.count > 0) {
          this.notifications
            .notifyPriceChangeProposalInvalidated(
              req.providerId,
              req.serviceName
            )
            .catch(() => {});
        }
      }
    }

    return withClientContactForViewer(updated, userId);
  }

  // Empuja al cliente a dejar una reseña verificada apenas se cierra el trato,
  // en vez de depender de que la descubra por su cuenta al visitar el perfil.
  private async sendReviewReminder(
    clientId: string,
    providerId: string,
    providerName: string
  ) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: { username: true },
    });
    return this.notifications.notifyReviewReminder(
      clientId,
      providerName,
      provider?.username
    );
  }

  async updateServiceRequestStatus(id: string, userId: string, status: string) {
    return this.updateServiceRequest(id, userId, { status });
  }

  // El cliente (requester) confirma que el servicio se completó realmente.
  // Solo desde CONTACTED, para evitar que se cierre algo que nunca avanzó,
  // y habilita la reseña verificada del proveedor.
  /**
   * Cierra la solicitud: cobra la comisión y libera la garantía. La confirma el
   * cliente (`userId`) o, con `auto`, el cierre automático cuando el proveedor
   * marcó el trabajo terminado y el cliente no respondió en
   * AUTO_CLOSE_AFTER_MS (ver closeUnconfirmedCompletions).
   */
  async confirmServiceRequestCompletion(
    id: string,
    userId: string | null,
    options: { auto?: boolean } = {}
  ) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (!options.auto && (!userId || req.requesterId !== userId))
      throw new ForbiddenException('No tienes permiso');
    if (req.status !== 'CONTACTED')
      throw new ForbiddenException(
        'Solo puedes confirmar una solicitud que ya fue contactada por el proveedor'
      );
    if (
      options.auto &&
      (!req.providerCompletedAt ||
        req.escrowStatus === 'DISPUTED' ||
        req.escrowStatus === 'PENDING_FUNDS')
    ) {
      throw new ConflictException(
        'La solicitud no se puede cerrar automáticamente'
      );
    }

    // Resolve fee before starting any write so we don't mark CLOSED on a fee error
    let feeData: { feeAmount: number; feeConfig: any } | null = null;
    if (!req.platformFeePayer && isPositive(req.price)) {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'SERVICE_REQUEST',
        req.providerId
      );
      if (feeConfig?.payer === 'PROVIDER') {
        feeData = {
          feeAmount: this.platformFees.calculateFee(req.price, feeConfig)
            .feeAmount,
          feeConfig,
        };
      }
    }

    // Charge fee and update status atomically — if fee charge fails, status stays CONTACTED
    if (feeData) {
      // Con garantía retenida, la comisión se descuenta de lo que se libera
      // (abajo): ya queda cobrada y no va al estado de cuenta.
      await this.platformFees.chargeProviderFee(
        'SERVICE_REQUEST',
        req.providerId,
        feeData.feeAmount,
        `FEE-SVC-${id}`,
        { serviceRequestId: id },
        {
          collected:
            req.escrowStatus === 'HELD' && isPositive(req.escrowAmount),
        }
      );
    }

    // Comisión que pagó el cliente (ya incluida en el precio): el proveedor
    // la recibió junto con el pago, así que se le registra a él. Con garantía
    // se descuenta de lo liberado (COLLECTED); sin garantía va a su estado de
    // cuenta. Antes no se registraba en ningún lado y la plataforma nunca la
    // cobraba.
    const escrowHeld =
      req.escrowStatus === 'HELD' && isPositive(req.escrowAmount);
    const clientFee =
      req.platformFeePayer === 'CLIENT' && isPositive(req.platformFeeAmount)
        ? req.platformFeeAmount
        : null;
    if (clientFee) {
      await this.platformFees.chargeProviderFee(
        'SERVICE_REQUEST',
        req.providerId,
        toNumber(clientFee),
        `FEE-SVC-${id}`,
        { serviceRequestId: id, payer: 'CLIENT' },
        { collected: escrowHeld }
      );
    }

    // Libera el escrow al proveedor, neto de la comisión (la paguen el
    // proveedor o el cliente): esa retención ES el cobro (registrado arriba
    // como COLLECTED), no se factura de nuevo en su estado de cuenta.
    if (escrowHeld) {
      const feeWithheld = feeData?.feeAmount ?? clientFee ?? 0;
      const releaseAmount = sub(req.escrowAmount!, feeWithheld);
      if (gt(releaseAmount, 0)) {
        await this.escrow.release({
          entityType: 'SERVICE_REQUEST',
          entityId: id,
          payeeId: req.providerId,
          amount: releaseAmount,
        });
      }
    }

    // Si el escrow seguía PENDING_FUNDS (el cliente nunca alcanzó a cubrir la
    // garantía) hay que cerrarlo acá mismo — de lo contrario el cron/hook de
    // reintento seguiría encontrando esta solicitud ya CLOSED y le cobraría al
    // cliente retroactivamente un servicio ya cerrado, sin volver a liberar
    // nada al proveedor (releaseEscrow solo se dispara desde este método).
    const escrowResolution =
      req.escrowStatus === 'HELD'
        ? { escrowStatus: 'RELEASED' as const }
        : req.escrowStatus === 'PENDING_FUNDS'
          ? { escrowStatus: 'NONE' as const, escrowAmount: null }
          : {};

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'CLOSED',
        statusUpdatedAt: new Date(),
        ...escrowResolution,
        ...(feeData
          ? {
              platformFeeRate: feeData.feeConfig.rate,
              platformFeeAmount: feeData.feeAmount,
              platformFeePayer: 'PROVIDER',
            }
          : {}),
      },
    });

    await this.prisma.serviceRequestStatusHistory.create({
      data: {
        serviceRequestId: id,
        previousStatus: req.status,
        newStatus: 'CLOSED',
        // null = cierre automático (ver el modelo).
        changedBy: options.auto ? null : userId,
      },
    });

    const clientId = options.auto ? req.requesterId : userId;
    if (clientId) {
      this.sendReviewReminder(clientId, req.providerId, req.providerName).catch(
        () => {}
      );
    }

    return updated;
  }

  // El cliente (requester) cancela su propia solicitud antes de que el proveedor
  // invierta tiempo contactándolo. Solo válido desde PENDING/SEEN — en el flujo
  // normal esto es antes de que exista precio/escrow (se fijan en CONTACTED),
  // pero el reembolso condicional de abajo es defensa en profundidad por si
  // las transiciones válidas cambian más adelante.
  async cancelServiceRequest(id: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.requesterId !== userId)
      throw new ForbiddenException('No tienes permiso');
    this.assertValidStatusTransition(req.status, 'CANCELLED');

    const escrowUpdate: any = {};
    if (req.escrowStatus === 'HELD' && isPositive(req.escrowAmount)) {
      await this.escrow.refund({
        entityType: 'SERVICE_REQUEST',
        entityId: id,
        payerId: userId,
        amount: req.escrowAmount,
      });
      escrowUpdate.escrowStatus = 'REFUNDED';
    } else if (req.escrowStatus === 'PENDING_FUNDS') {
      escrowUpdate.escrowStatus = 'NONE';
      escrowUpdate.escrowAmount = null;
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusUpdatedAt: new Date(),
        ...escrowUpdate,
      },
    });

    await this.prisma.serviceRequestStatusHistory.create({
      data: {
        serviceRequestId: id,
        previousStatus: req.status,
        newStatus: 'CANCELLED',
        changedBy: userId,
      },
    });

    this.notifications
      .notifyServiceRequestCancelled(
        req.providerId,
        req.clientName,
        req.serviceName
      )
      .catch(() => {});

    return updated;
  }

  // El cliente O el proveedor pueden disputar una garantía retenida (HELD)
  // cuando no están de acuerdo con cómo terminó — congela la liberación/
  // reembolso automáticos hasta que un admin la resuelva. Solo tiene sentido
  // desde CONTACTED (ya hay precio fijado y trabajo en curso); antes de eso
  // no hay nada que disputar todavía.
  // El proveedor avisa que terminó el trabajo. Antes solo el cliente podía
  // cerrar: si no confirmaba, la solicitud quedaba abierta para siempre (sin
  // comisión, sin reseña y con la garantía retenida). Ahora el cliente tiene
  // AUTO_CLOSE_AFTER_MS para confirmar o reportar un problema; si no hace
  // nada, se cierra solo.
  async markServiceRequestDone(id: string, providerId: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== providerId)
      throw new ForbiddenException('No tienes permiso');
    if (req.status !== 'CONTACTED') {
      throw new BadRequestException(
        'Solo puedes marcar como terminada una solicitud en curso'
      );
    }
    if (req.escrowStatus === 'PENDING_FUNDS') {
      throw new BadRequestException(
        'El cliente todavía no pagó la garantía: espera a que quede retenida'
      );
    }
    if (req.escrowStatus === 'DISPUTED') {
      throw new BadRequestException(
        'Hay una disputa abierta: soporte la está revisando'
      );
    }
    if (req.providerCompletedAt) return req;

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { providerCompletedAt: new Date() },
    });
    if (req.requesterId) {
      this.notifications
        .notifyServiceRequestProviderCompleted(
          req.requesterId,
          req.providerName,
          req.serviceName,
          id,
          AUTO_CLOSE_AFTER_MS / 3_600_000
        )
        .catch(() => {});
    }
    return updated;
  }

  // Cron: cierra las solicitudes que el proveedor marcó terminadas y el
  // cliente no confirmó ni disputó a tiempo. Una por una: un fallo (ej. al
  // liberar la garantía) no frena a las demás y se reintenta en la próxima
  // corrida.
  async closeUnconfirmedCompletions(now = new Date()) {
    const due = await this.prisma.serviceRequest.findMany({
      where: {
        status: 'CONTACTED',
        providerCompletedAt: {
          lte: new Date(now.getTime() - AUTO_CLOSE_AFTER_MS),
        },
        escrowStatus: { notIn: ['DISPUTED', 'PENDING_FUNDS'] },
      },
      select: {
        id: true,
        providerId: true,
        requesterId: true,
        serviceName: true,
      },
      take: 200,
    });
    let closed = 0;
    for (const req of due) {
      const { id } = req;
      try {
        await this.confirmServiceRequestCompletion(id, null, { auto: true });
        closed++;
        this.notifications
          .notifyServiceRequestAutoClosed(
            req.providerId,
            req.requesterId,
            req.serviceName
          )
          .catch(() => {});
      } catch (err) {
        this.logger.warn(
          `Cierre automático de la solicitud ${id} falló: ${(err as Error).message}`
        );
      }
    }
    return { checked: due.length, closed };
  }

  // Cron: garantías que nadie pagó a tiempo. Sin esto la solicitud quedaba
  // esperando para siempre y el proveedor no podía hacer nada.
  // - Garantía inicial sin pagar: la solicitud se cancela (no hay dinero
  //   retenido que devolver).
  // - Aumento de precio aprobado sin pagar: la propuesta caduca y la
  //   solicitud sigue con la garantía original (que sigue retenida).
  // Las que tienen un pago reportado en revisión no se tocan.
  async expireUnpaidGuarantees(now = new Date()) {
    const cutoff = new Date(now.getTime() - GUARANTEE_PAYMENT_WINDOW_MS);
    const inReview = await this.prisma.escrowFundingReport.findMany({
      where: { sourceType: 'SERVICE_REQUEST', status: 'SUBMITTED' },
      select: { sourceId: true },
    });
    const reviewing = new Set(inReview.map((r) => r.sourceId));

    // Aumentos aprobados sin fondos.
    const staleIncreases =
      await this.prisma.serviceRequestPriceChangeProposal.findMany({
        where: {
          status: 'APPROVED_PENDING_FUNDS',
          resolvedAt: { lte: cutoff },
        },
        include: { serviceRequest: true },
        take: 200,
      });
    let increasesExpired = 0;
    for (const p of staleIncreases) {
      const req = p.serviceRequest;
      if (reviewing.has(req.id) || req.escrowStatus !== 'PENDING_FUNDS')
        continue;
      await this.prisma.$transaction([
        this.prisma.serviceRequestPriceChangeProposal.update({
          where: { id: p.id },
          data: { status: 'INVALIDATED' },
        }),
        this.prisma.serviceRequest.update({
          where: { id: req.id },
          data: { escrowStatus: 'HELD' },
        }),
      ]);
      increasesExpired++;
      this.notifications
        .notifyGuaranteeExpired(
          req.providerId,
          req.requesterId,
          req.serviceName,
          'increase'
        )
        .catch(() => {});
    }

    // Garantía inicial sin pagar.
    const stale = await this.prisma.serviceRequest.findMany({
      where: {
        status: 'CONTACTED',
        escrowStatus: 'PENDING_FUNDS',
        OR: [
          { statusUpdatedAt: { lte: cutoff } },
          { statusUpdatedAt: null, createdAt: { lte: cutoff } },
        ],
        priceChangeProposals: { none: { status: 'APPROVED_PENDING_FUNDS' } },
      },
      take: 200,
    });
    let cancelled = 0;
    for (const req of stale) {
      if (reviewing.has(req.id)) continue;
      const changed = await this.prisma.serviceRequest.updateMany({
        where: {
          id: req.id,
          status: 'CONTACTED',
          escrowStatus: 'PENDING_FUNDS',
        },
        data: {
          status: 'CANCELLED',
          statusUpdatedAt: now,
          escrowStatus: 'NONE',
          escrowAmount: null,
        },
      });
      if (changed.count !== 1) continue;
      await this.prisma.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: req.id,
          previousStatus: 'CONTACTED',
          newStatus: 'CANCELLED',
          changedBy: null,
        },
      });
      cancelled++;
      this.notifications
        .notifyGuaranteeExpired(
          req.providerId,
          req.requesterId,
          req.serviceName,
          'request'
        )
        .catch(() => {});
    }
    return { cancelled, increasesExpired };
  }

  async disputeServiceRequest(id: string, userId: string, reason: string) {
    const trimmed = reason?.trim() ?? '';
    if (trimmed.length < 10) {
      throw new BadRequestException(
        'Explica el problema (mínimo 10 caracteres) para que soporte pueda revisarlo'
      );
    }
    reason = trimmed.slice(0, 1000);
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }
    if (req.status !== 'CONTACTED') {
      throw new BadRequestException(
        'Solo se puede disputar una solicitud en curso (contactada)'
      );
    }

    const dispute = await this.escrow.openDispute({
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      raisedById: userId,
      reason,
    });

    this.notifications
      .notifyEscrowDisputeOpened(
        userId === req.requesterId ? req.providerId : req.requesterId!,
        req.serviceName
      )
      .catch(() => {});

    return dispute;
  }

  /**
   * Resuelve la disputa de una solicitud (mueve el dinero vía escrow) y la
   * deja terminada: si algo se liberó al proveedor, CLOSED con la comisión
   * sobre lo liberado (va a su estado de cuenta: la garantía se liberó
   * entera); si todo volvió al cliente, CANCELLED y sin comisión. Sin esto la
   * solicitud quedaba en curso y el cierre automático podía cobrarle comisión
   * al proveedor aunque el cliente hubiera recibido todo de vuelta.
   */
  async resolveServiceRequestDispute(
    adminId: string,
    disputeId: string,
    dto: {
      resolution: 'RELEASE_FULL' | 'REFUND_FULL' | 'SPLIT';
      releaseAmount?: number;
      refundAmount?: number;
      resolutionNote?: string;
    }
  ) {
    const dispute = await this.prisma.escrowDispute.findUnique({
      where: { id: disputeId },
      include: { escrow: true },
    });
    if (!dispute || dispute.escrow.entityType !== 'SERVICE_REQUEST') {
      throw new NotFoundException('Disputa no encontrada');
    }
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: dispute.escrow.entityId },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    const resolved = await this.escrow.resolveDispute({
      disputeId,
      resolvedById: adminId,
      resolution: dto.resolution,
      releaseAmount: dto.releaseAmount,
      refundAmount: dto.refundAmount,
      resolutionNote: dto.resolutionNote,
    });

    const released = resolved.releaseAmount ?? 0;
    const newStatus = released > 0 ? 'CLOSED' : 'CANCELLED';
    if (released > 0) {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'SERVICE_REQUEST',
        req.providerId
      );
      if (feeConfig) {
        const { feeAmount } = this.platformFees.calculateFee(
          released,
          feeConfig
        );
        await this.platformFees.chargeProviderFee(
          'SERVICE_REQUEST',
          req.providerId,
          feeAmount,
          `FEE-SVC-${req.id}`,
          { serviceRequestId: req.id, disputeId, released }
        );
      }
    }
    if (req.status !== 'CLOSED' && req.status !== 'CANCELLED') {
      await this.prisma.serviceRequest.update({
        where: { id: req.id },
        data: { status: newStatus, statusUpdatedAt: new Date() },
      });
      await this.prisma.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: req.id,
          previousStatus: req.status,
          newStatus,
          changedBy: adminId,
        },
      });
    }
    return { ...resolved, serviceRequestStatus: newStatus };
  }

  // Disputas abiertas de solicitudes de servicio que involucran al usuario
  // (para mostrar el estado en el detalle).
  async getServiceRequestDispute(id: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }
    return this.prisma.escrowDispute.findFirst({
      where: { escrow: { entityType: 'SERVICE_REQUEST', entityId: id } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        reason: true,
        raisedByRole: true,
        resolution: true,
        releaseAmount: true,
        refundAmount: true,
        resolutionNote: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
  }

  // ─── Escrow retry (3.3b) ────────────────────────────────────────────────────

  // Reintenta la retención de garantía para una solicitud puntual que quedó en
  // PENDING_FUNDS. No-op si ya no está pendiente (otro reintento la resolvió
  // primero) — hace que llamar esto en paralelo desde el hook y el cron sea seguro.
  //
  // PENDING_FUNDS puede significar dos cosas distintas y hay que desambiguar antes
  // de reintentar: (a) la retención INICIAL nunca se completó (camino de siempre,
  // reintenta con req.escrowAmount = req.price completo), o (b) una propuesta de
  // aumento de precio ya fue APROBADA por el cliente pero no había saldo para el
  // delta (queda en ServiceRequestPriceChangeProposal.status='APPROVED_PENDING_FUNDS'
  // — ver approvePriceChangeProposal). En ese segundo caso solo se reintenta el
  // delta, no el precio total, o se duplicaría la retención ya existente.
  private async retryPendingEscrow(requestId: string): Promise<boolean> {
    // Apagado: no se retiene dinero nuevo; la garantía pendiente vence sola.
    if (!features.protectedPayments()) return false;
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!req || req.escrowStatus !== 'PENDING_FUNDS' || !req.requesterId) {
      return false;
    }

    const pendingProposal =
      await this.prisma.serviceRequestPriceChangeProposal.findFirst({
        where: {
          serviceRequestId: requestId,
          status: 'APPROVED_PENDING_FUNDS',
        },
        orderBy: { createdAt: 'asc' },
      });

    if (pendingProposal) {
      try {
        await this.escrow.hold({
          entityType: 'SERVICE_REQUEST',
          entityId: req.id,
          payerId: req.requesterId,
          payeeId: req.providerId,
          deltaAmount: pendingProposal.deltaAmount,
          referenceOverride:
            pendingProposal.escrowReference ??
            `ESCROW-HOLD-INCREASE-${pendingProposal.id}`,
        });
      } catch {
        return false;
      }
      await this.prisma.$transaction([
        this.prisma.serviceRequest.update({
          where: { id: req.id },
          data: {
            escrowStatus: 'HELD',
            price: add(req.price!, pendingProposal.deltaAmount),
            escrowAmount: add(
              req.escrowAmount ?? 0,
              pendingProposal.deltaAmount
            ),
          },
        }),
        this.prisma.serviceRequestPriceChangeProposal.update({
          where: { id: pendingProposal.id },
          data: { status: 'APPROVED' },
        }),
      ]);
      this.notifications
        .notifyPriceChangeApproved(
          req.providerId,
          req.clientName,
          req.serviceName,
          toNumber(pendingProposal.deltaAmount)
        )
        .catch(() => {});
      return true;
    }

    if (!isPositive(req.escrowAmount)) return false;
    try {
      await this.escrow.hold({
        entityType: 'SERVICE_REQUEST',
        entityId: req.id,
        payerId: req.requesterId,
        payeeId: req.providerId,
        deltaAmount: req.escrowAmount,
      });
    } catch {
      return false;
    }
    await this.prisma.serviceRequest.update({
      where: { id: req.id },
      data: { escrowStatus: 'HELD', escrowHeldAt: new Date() },
    });
    this.notifications
      .notifyEscrowHeld(
        req.requesterId,
        req.providerName,
        req.serviceName,
        toNumber(req.escrowAmount)
      )
      .catch(() => {});
    return true;
  }

  // Reintento de UNA solicitud: lo usa el pago de garantía por operación
  // (money/escrow-funding), donde el dinero acreditado es para esa solicitud.
  retryPendingEscrowForRequest(requestId: string) {
    return this.retryPendingEscrow(requestId);
  }

  // Llamado fire-and-forget desde WalletsService tras un depósito exitoso.
  // Reintenta las solicitudes pendientes del mismo cliente, más antigua primero,
  // deteniéndose en el primer saldo insuficiente (las siguientes tampoco alcanzarían).
  async retryPendingEscrowsForClient(clientUserId: string) {
    const pending = await this.prisma.serviceRequest.findMany({
      where: { requesterId: clientUserId, escrowStatus: 'PENDING_FUNDS' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    for (const { id } of pending) {
      const held = await this.retryPendingEscrow(id);
      if (!held) break;
    }
  }

  // Cron de respaldo (por si el hook de depósito falla o el saldo llegó por
  // otra vía, ej. ajuste manual de admin). Reintenta todas las solicitudes
  // pendientes; si sigue sin alcanzar, no reenvía la notificación en cada
  // corrida — solo la primera vez fue vía updateServiceRequest.
  async retryAllPendingEscrows() {
    const pending = await this.prisma.serviceRequest.findMany({
      where: { escrowStatus: 'PENDING_FUNDS' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    let resolved = 0;
    for (const { id } of pending) {
      if (await this.retryPendingEscrow(id)) resolved++;
    }
    return { checked: pending.length, resolved };
  }

  // ─── Price change proposals ───────────────────────────────────────────────
  // El proveedor propone agregar ítems/aumentar el precio de una solicitud ya
  // en curso (CONTACTED); requiere aprobación explícita del cliente antes de
  // tocar el escrow — nunca se autoaplica. Ver plan en playful-dreaming-bunny.md.

  // Solo el proveedor propietario puede proponer, y solo mientras la solicitud
  // está CONTACTED — antes de eso el precio base sigue negociándose libremente
  // vía updateServiceRequest; después (CLOSED/CANCELLED/REJECTED) ya no aplica.
  async proposePriceChange(
    serviceRequestId: string,
    providerId: string,
    dto: CreatePriceChangeProposalDto
  ) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== providerId)
      throw new ForbiddenException('No tienes permiso');
    if (req.status !== 'CONTACTED') {
      throw new BadRequestException(
        'Solo puedes proponer un aumento de precio mientras la solicitud está en curso (contactada)'
      );
    }

    const existingPending =
      await this.prisma.serviceRequestPriceChangeProposal.findFirst({
        where: { serviceRequestId, status: 'PENDING' },
      });
    if (existingPending) {
      throw new BadRequestException(
        'Ya existe una propuesta de aumento pendiente de respuesta del cliente'
      );
    }

    const previousPrice = req.price ?? 0;
    const deltaAmount = sub(dto.proposedPrice, previousPrice);
    if (!isPositive(deltaAmount)) {
      throw new BadRequestException(
        'El precio propuesto debe ser mayor al precio actual'
      );
    }

    const proposal = await this.prisma.serviceRequestPriceChangeProposal.create(
      {
        data: {
          serviceRequestId,
          previousPrice,
          proposedPrice: dto.proposedPrice,
          deltaAmount,
          note: dto.note,
          proposedBy: providerId,
          items: {
            create: dto.items.map((item) => ({
              fields: item.fields ?? {},
              notes: item.notes,
              photos: item.photos ?? [],
              videos: item.videos ?? [],
            })),
          },
        },
        include: { items: true },
      }
    );

    if (req.requesterId) {
      this.notifications
        .notifyPriceChangeProposed(
          req.requesterId,
          req.providerName,
          req.serviceName,
          toNumber(deltaAmount)
        )
        .catch(() => {});
    }

    return proposal;
  }

  // Ambas partes de la solicitud pueden ver el historial completo de propuestas
  // (trazabilidad de quién propuso/aprobó/rechazó y cuándo).
  async listPriceChangeProposals(serviceRequestId: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }
    return this.prisma.serviceRequestPriceChangeProposal.findMany({
      where: { serviceRequestId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // El cliente aprueba: retiene el DELTA en escrow (nunca el precio total, ya
  // se retuvo antes) y, si tiene éxito, migra los ítems propuestos a
  // ServiceRequestItem y actualiza price/escrowAmount juntos — cierra el bug
  // de desincronización de escrow que motivó este feature (ver contexto del plan).
  async approvePriceChangeProposal(proposalId: string, clientUserId: string) {
    const proposal =
      await this.prisma.serviceRequestPriceChangeProposal.findUnique({
        where: { id: proposalId },
        include: { items: true, serviceRequest: true },
      });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta propuesta ya fue resuelta');
    }
    const req = proposal.serviceRequest;
    if (req.requesterId !== clientUserId)
      throw new ForbiddenException('No tienes permiso');
    if (req.status !== 'CONTACTED') {
      throw new BadRequestException(
        'La solicitud ya no está en un estado que permita aprobar esta propuesta'
      );
    }

    // El fee de plataforma (si lo paga el cliente) también aplica sobre el
    // delta aprobado, igual que ya aplica sobre el precio inicial en
    // updateServiceRequest — mismo criterio, no se cobra aparte.
    let deltaWithFee = toDecimal(proposal.deltaAmount);
    const feeConfig = await this.platformFees.resolveFeeConfig(
      'SERVICE_REQUEST',
      req.providerId
    );
    if (feeConfig?.payer === 'CLIENT') {
      const { feeAmount } = this.platformFees.calculateFee(
        proposal.deltaAmount,
        feeConfig
      );
      deltaWithFee = add(proposal.deltaAmount, feeAmount);
    }

    // Solo se retiene el delta si la solicitud ya tiene una garantía retenida.
    // Con pago directo (sin garantía) el aumento solo cambia el precio: antes
    // también intentaba retener (y con Pago Protegido apagado, hold() lo
    // rechaza, así que el cliente no podía aprobar ningún aumento).
    const hasHeldEscrow = req.escrowStatus === 'HELD';
    const escrowReference = hasHeldEscrow
      ? `ESCROW-HOLD-INCREASE-${proposal.id}`
      : null;

    if (hasHeldEscrow) {
      try {
        await this.escrow.hold({
          entityType: 'SERVICE_REQUEST',
          entityId: req.id,
          payerId: clientUserId,
          payeeId: req.providerId,
          deltaAmount: deltaWithFee,
          referenceOverride: escrowReference!,
        });
      } catch (err) {
        if (!(err instanceof InsufficientEscrowFundsError)) throw err;

        await this.prisma.$transaction([
          this.prisma.serviceRequestPriceChangeProposal.update({
            where: { id: proposalId },
            data: {
              status: 'APPROVED_PENDING_FUNDS',
              deltaAmount: deltaWithFee,
              resolvedBy: clientUserId,
              resolvedAt: new Date(),
              escrowReference,
            },
          }),
          this.prisma.serviceRequest.update({
            where: { id: req.id },
            data: { escrowStatus: 'PENDING_FUNDS' },
          }),
        ]);

        this.notifications
          .notifyPriceChangeApprovedPendingFunds(
            clientUserId,
            req.providerName,
            req.serviceName,
            toNumber(deltaWithFee)
          )
          .catch(() => {});

        return this.prisma.serviceRequestPriceChangeProposal.findUnique({
          where: { id: proposalId },
          include: { items: true },
        });
      }
    }

    const existingMaxSortOrder = await this.prisma.serviceRequestItem.aggregate(
      {
        where: { serviceRequestId: req.id },
        _max: { sortOrder: true },
      }
    );
    let nextSortOrder = (existingMaxSortOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.$transaction([
      this.prisma.serviceRequest.update({
        where: { id: req.id },
        data: {
          price: add(req.price ?? 0, deltaWithFee),
          ...(hasHeldEscrow
            ? { escrowAmount: add(req.escrowAmount ?? 0, deltaWithFee) }
            : {}),
          ...(feeConfig?.payer === 'CLIENT'
            ? {
                platformFeeAmount: add(
                  req.platformFeeAmount ?? 0,
                  sub(deltaWithFee, proposal.deltaAmount)
                ),
              }
            : {}),
        },
      }),
      this.prisma.serviceRequestPriceChangeProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPROVED',
          deltaAmount: deltaWithFee,
          resolvedBy: clientUserId,
          resolvedAt: new Date(),
          escrowReference,
        },
      }),
      ...proposal.items.map((item) =>
        this.prisma.serviceRequestItem.create({
          data: {
            serviceRequestId: req.id,
            fields: item.fields as any,
            notes: item.notes,
            photos: item.photos,
            videos: item.videos,
            sortOrder: nextSortOrder++,
          },
        })
      ),
    ]);

    this.notifications
      .notifyPriceChangeApproved(
        req.providerId,
        req.clientName,
        req.serviceName,
        toNumber(deltaWithFee)
      )
      .catch(() => {});

    return this.prisma.serviceRequestPriceChangeProposal.findUnique({
      where: { id: proposalId },
      include: { items: true },
    });
  }

  // El cliente rechaza: no se toca price/escrow/items, solo queda registrada
  // la propuesta como REJECTED para auditoría.
  async rejectPriceChangeProposal(
    proposalId: string,
    clientUserId: string,
    reason?: string
  ) {
    const proposal =
      await this.prisma.serviceRequestPriceChangeProposal.findUnique({
        where: { id: proposalId },
        include: { serviceRequest: true },
      });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta propuesta ya fue resuelta');
    }
    const req = proposal.serviceRequest;
    if (req.requesterId !== clientUserId)
      throw new ForbiddenException('No tienes permiso');

    const updated = await this.prisma.serviceRequestPriceChangeProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        resolvedBy: clientUserId,
        resolvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    this.notifications
      .notifyPriceChangeRejected(
        req.providerId,
        req.clientName,
        req.serviceName,
        toNumber(proposal.deltaAmount),
        reason
      )
      .catch(() => {});

    return updated;
  }

  // ─── Admin (solo lectura) ─────────────────────────────────────────────────

  async getServiceRequestsAdmin(
    filters: {
      status?: string;
      providerId?: string;
      requesterId?: string;
      from?: string;
      to?: string;
    },
    page = 1,
    limit = 20
  ) {
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;
    const where: Prisma.ServiceRequestWhereInput = {
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.providerId ? { providerId: filters.providerId } : {}),
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };
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
    return {
      data: await this.withAvatars(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getServiceRequestAdminDetail(id: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    const [withAvatar] = await this.withAvatars([req]);
    return withAvatar;
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

  // ─── Opportunity Engine ──────────────────────────────────────────────────
  // Demanda de servicios por categoría: cuántas solicitudes recibió el
  // mercado en los últimos 30 días y a qué precio promedio, para que alguien
  // decida convertirse en proveedor de esa categoría. ServiceRequest no
  // denormaliza categoryId, así que se resuelve vía Service.categoryId antes
  // de agrupar en memoria (no hay categoryId a nivel de ServiceRequest para
  // un groupBy directo).
  async getOpportunities(city?: string) {
    const since = new Date(Date.now() - 30 * 86400_000);

    const [requests, unmetSearches] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: {
          createdAt: { gte: since },
          ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        },
        select: {
          price: true,
          service: {
            select: {
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      this.prisma.unmetSearch.findMany({
        where: {
          createdAt: { gte: since },
          ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        },
        select: { query: true },
      }),
    ]);

    const byCategory = new Map<
      string,
      {
        name: string;
        color: string;
        count: number;
        priceSum: MoneyInput;
        priceCount: number;
      }
    >();

    for (const r of requests) {
      const category = r.service.category;
      if (!category) continue;
      const cur = byCategory.get(category.id) ?? {
        name: category.name,
        color: category.color,
        count: 0,
        priceSum: 0,
        priceCount: 0,
      };
      cur.count += 1;
      if (r.price != null) {
        cur.priceSum = add(cur.priceSum, r.price);
        cur.priceCount += 1;
      }
      byCategory.set(category.id, cur);
    }

    const opportunities = Array.from(byCategory.entries())
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: v.name,
        categoryColor: v.color,
        requestCount: v.count,
        avgPrice:
          v.priceCount > 0 ? toNumber(div(v.priceSum, v.priceCount)) : null,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    // Demanda insatisfecha: no se mapea a una ServiceCategory real (el
    // matching texto→categoría no existe todavía) — se muestra tal cual como
    // señal cruda de qué está buscando la gente sin encontrarlo.
    const byQuery = new Map<string, number>();
    for (const s of unmetSearches) {
      const normalized = s.query.trim().toLowerCase();
      if (!normalized) continue;
      byQuery.set(normalized, (byQuery.get(normalized) ?? 0) + 1);
    }
    const unmetQueries = Array.from(byQuery.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      data: opportunities,
      unmetQueries,
      city: city ?? null,
      periodDays: 30,
    };
  }

  async getServiceMetrics(id: string, userId: string) {
    await this.assertOwner(id, userId);

    const now = new Date();
    const days7ago = new Date(now.getTime() - 7 * 86400_000);
    const days30ago = new Date(now.getTime() - 30 * 86400_000);
    const days14ago = new Date(now.getTime() - 14 * 86400_000);

    const [
      views,
      profileVisits,
      requests,
      viewsLast7,
      viewsPrev7,
      requestsLast30,
      recentViewEvents,
      lastRequest,
    ] = await Promise.all([
      // Totales históricos
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.VIEW },
      }),
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.PROFILE_VISIT },
      }),
      this.prisma.serviceEvent.count({
        where: { serviceId: id, type: ServiceEventType.REQUEST },
      }),
      // Vistas últimos 7 días vs 7 días anteriores (para tendencia)
      this.prisma.serviceEvent.count({
        where: {
          serviceId: id,
          type: ServiceEventType.VIEW,
          createdAt: { gte: days7ago },
        },
      }),
      this.prisma.serviceEvent.count({
        where: {
          serviceId: id,
          type: ServiceEventType.VIEW,
          createdAt: { gte: days14ago, lt: days7ago },
        },
      }),
      // Solicitudes últimos 30 días
      this.prisma.serviceEvent.count({
        where: {
          serviceId: id,
          type: ServiceEventType.REQUEST,
          createdAt: { gte: days30ago },
        },
      }),
      // Eventos de vista recientes para gráfico por día
      this.prisma.serviceEvent.findMany({
        where: {
          serviceId: id,
          type: ServiceEventType.VIEW,
          createdAt: { gte: days7ago },
        },
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
    const viewsTrend =
      viewsPrev7 > 0
        ? Math.round(((viewsLast7 - viewsPrev7) / viewsPrev7) * 100)
        : viewsLast7 > 0
          ? 100
          : 0;

    const conversionRate = views > 0 ? Math.round((requests / views) * 100) : 0;
    // Tasa de interés: visitas al perfil / vistas totales
    const interestRate =
      views > 0 ? Math.round((profileVisits / views) * 100) : 0;
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
      viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({
        date,
        count,
      })),
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
