import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductStatus, CatalogOrderStatus } from '@prisma/client';
import { QueryCatalogDto, CatalogSortBy } from './dto/query-catalog.dto';
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { tagSearchCondition } from '../../../common/utils/tags.util';
import { EscrowFacade, ESCROW_FACADE } from '../../money/escrow/escrow.facade';
import { PlatformFeesFacade, PLATFORM_FEES_FACADE } from '../../money/platform-fees/platform-fees.facade';
import { InsufficientEscrowFundsError } from '../../money/wallets/wallets.service';
import { v4 as uuidv4 } from 'uuid';

function attachProductRating<T extends { commerce: { user: { reviewsReceived: { rating: number }[], [k: string]: any }, [k: string]: any }, [k: string]: any }>(product: T) {
  const reviews = product.commerce.user.reviewsReceived;
  const rating = reviews.length
    ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
    : null;
  const reviewsCount = reviews.length;
  const { reviewsReceived: _, ...userWithoutReviews } = product.commerce.user;
  return {
    ...product,
    commerce: { ...product.commerce, user: { ...userWithoutReviews, rating, reviewsCount } },
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(ESCROW_FACADE) private escrow: EscrowFacade,
    @Inject(PLATFORM_FEES_FACADE) private platformFees: PlatformFeesFacade
  ) {}

  async getCategories() {
    // Return distinct category names that have at least 1 AVAILABLE product for sale
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { status: ProductStatus.AVAILABLE, forSale: true },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.AVAILABLE, forSale: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        productCount: c._count.products,
      })),
    };
  }

  // Top tags reales (por frecuencia) entre productos en venta, opcionalmente
  // filtrados por substring `q` para autocompletado. Se trae solo la columna
  // `tags` y se cuenta en memoria: evita mantener una tabla maestra aparte.
  async getPopularTags(q?: string, limit = 20): Promise<{ tag: string; count: number }[]> {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.AVAILABLE, forSale: true },
      select: { tags: true },
    });
    const counts = new Map<string, number>();
    for (const p of products) {
      for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const query = q?.trim().toLowerCase();
    return Array.from(counts.entries())
      .filter(([tag]) => !query || tag.includes(query))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  async getCommerces() {
    const commerces = await this.prisma.commerce.findMany({
      where: {
        products: {
          some: { status: ProductStatus.AVAILABLE, forSale: true },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.AVAILABLE, forSale: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: commerces.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        productCount: c._count.products,
      })),
    };
  }

  async getStoreBySlug(slug: string, currentUserId?: string) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        address: true,
        phone: true,
        email: true,
        schedule: true,
        slug: true,
        avgRating: true,
        reviewsCount: true,
        country: true,
        state: true,
        city: true,
        description: true,
        isPublic: true,
        socialLinks: true,
        settings: {
          select: {
            avgPrepTime: true,
            avgDeliveryTime: true,
            deliveryFee: true,
            freeDeliveryMinimum: true,
          },
        },
        // username/freelancerSettings.slug: para el link "Ver perfil
        // profesional" en /loja/:slug — un Commerce puede pertenecer a un
        // PROFESIONAL que también vende servicios ("opción 2"), no solo a un
        // perfil BUSINESS puro. null si nunca activó perfil profesional.
        user: {
          select: {
            avatar: true,
            coverImage: true,
            username: true,
            freelancerSettings: { select: { slug: true } },
          },
        },
        _count: {
          select: {
            products: { where: { status: ProductStatus.AVAILABLE, forSale: true } },
          },
        },
      },
    });

    // Mismo criterio de "no encontrado" tanto si el slug no existe como si
    // el dueño la ocultó — evita filtrar a un visitante que una tienda con
    // ese slug existe pero está oculta.
    if (!commerce || (!commerce.isPublic && commerce.userId !== currentUserId)) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const { _count, userId, user, ...rest } = commerce;
    return {
      data: {
        ...rest,
        user: { avatar: user.avatar, coverImage: user.coverImage },
        productCount: _count.products,
        // Solo se expone si el dueño tiene perfil profesional activo con
        // slug propio — ver ProfilePublicView.vue, que arma /pro/:slug.
        professionalSlug: user.freelancerSettings?.slug ?? null,
      },
    };
  }

  async getProducts(dto: QueryCatalogDto) {
    const {
      search,
      categoryName,
      commerceId,
      priceMin,
      priceMax,
      page = 1,
      limit = 20,
      sort = CatalogSortBy.RELEVANCE,
      country,
      state,
      city,
    } = dto;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: ProductStatus.AVAILABLE,
      forSale: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { commerce: { name: { contains: search, mode: 'insensitive' } } },
        { tags: tagSearchCondition(search) },
      ];
    }

    if (categoryName) {
      where.category = { name: { equals: categoryName, mode: 'insensitive' } };
    }

    if (commerceId) {
      where.commerceId = commerceId;
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {
        ...(priceMin !== undefined ? { gte: priceMin } : {}),
        ...(priceMax !== undefined ? { lte: priceMax } : {}),
      };
    }

    if (city || state || country) {
      return this.getProductsNearMe(where, { country, state, city }, page, limit, sort);
    }

    if (sort === CatalogSortBy.RATING_DESC) {
      return this.getProductsSortedByRating(where, page, limit);
    }
    if (sort === CatalogSortBy.BEST_SELLER) {
      return this.getProductsSortedByBestSeller(where, page, limit);
    }

    let orderBy: Record<string, unknown> = { name: 'asc' };
    if (sort === CatalogSortBy.PRICE_ASC) orderBy = { price: 'asc' };
    else if (sort === CatalogSortBy.PRICE_DESC) orderBy = { price: 'desc' };
    else if (sort === CatalogSortBy.NAME) orderBy = { name: 'asc' };
    else orderBy = { createdAt: 'desc' }; // relevance = newest first

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: this.productSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(attachProductRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Filtra productos por ubicación del comercio con fallback en cascada:
   * ciudad exacta → estado → país. Si la ciudad no arroja resultados,
   * se amplía la búsqueda al siguiente nivel e informa `locationTier`.
   */
  private async getProductsNearMe(
    baseWhere: Record<string, unknown>,
    location: { country?: string; state?: string; city?: string },
    page: number,
    limit: number,
    sort: CatalogSortBy
  ) {
    const { country, state, city } = location;
    const skip = (page - 1) * limit;

    let orderBy: Record<string, unknown> = { createdAt: 'desc' };
    if (sort === CatalogSortBy.PRICE_ASC) orderBy = { price: 'asc' };
    else if (sort === CatalogSortBy.PRICE_DESC) orderBy = { price: 'desc' };
    else if (sort === CatalogSortBy.NAME) orderBy = { name: 'asc' };

    const tiers: { tier: 'city' | 'state' | 'country'; commerce: Record<string, unknown> }[] = [];
    if (city) tiers.push({ tier: 'city', commerce: { city: { equals: city, mode: 'insensitive' } } });
    if (state) tiers.push({ tier: 'state', commerce: { state: { equals: state, mode: 'insensitive' } } });
    if (country) tiers.push({ tier: 'country', commerce: { country: { equals: country, mode: 'insensitive' } } });

    for (const { tier, commerce } of tiers) {
      const where = { ...baseWhere, commerce };

      if (sort === CatalogSortBy.RATING_DESC) {
        const result = await this.getProductsSortedByRating(where, page, limit);
        if (result.total > 0) return { ...result, locationTier: tier };
        continue;
      }
      if (sort === CatalogSortBy.BEST_SELLER) {
        const result = await this.getProductsSortedByBestSeller(where, page, limit);
        if (result.total > 0) return { ...result, locationTier: tier };
        continue;
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({ where, skip, take: limit, orderBy, select: this.productSelect }),
        this.prisma.product.count({ where }),
      ]);

      if (total > 0) {
        return {
          data: products.map(attachProductRating),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          locationTier: tier,
        };
      }
    }

    // Sin resultados en ninguna ubicación: devolver vacío
    return { data: [], total: 0, page, limit, totalPages: 0, locationTier: null };
  }

  private readonly productSelect = {
    id: true,
    name: true,
    description: true,
    price: true,
    image: true,
    preparationTime: true,
    calories: true,
    unit: true,
    status: true,
    tags: true,
    isBundle: true,
    category: {
      select: { id: true, name: true, color: true },
    },
    commerce: {
      select: {
        id: true,
        name: true,
        type: true,
        country: true,
        state: true,
        city: true,
        user: {
          select: {
            username: true,
            reviewsReceived: { select: { rating: true } },
          },
        },
      },
    },
  } as const;

  /**
   * Ordena por calificación promedio cacheada del comercio (Commerce.avgRating,
   * mantenida al día por ProfilesService.recalculateCommerceRating en cada
   * review creada/editada/oculta). ORDER BY nativo en Postgres — antes traía
   * TODO el catálogo matcheante a memoria para ordenar con Array.sort.
   */
  private async getProductsSortedByRating(
    where: Record<string, unknown>,
    page: number,
    limit: number
  ) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { commerce: { avgRating: { sort: 'desc', nulls: 'last' } } },
        select: this.productSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(attachProductRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Ordena por unidades vendidas cacheadas (Product.salesCount, mantenida al
   * día por CatalogService.createOrder). ORDER BY nativo en Postgres.
   */
  private async getProductsSortedByBestSeller(
    where: Record<string, unknown>,
    page: number,
    limit: number
  ) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { salesCount: 'desc' },
        select: this.productSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(attachProductRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: ProductStatus.AVAILABLE, forSale: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        preparationTime: true,
        calories: true,
        unit: true,
        status: true,
        ingredients: true,
        allergens: true,
        isBundle: true,
        bundleItems: {
          select: {
            quantity: true,
            componentProduct: { select: { id: true, name: true, price: true, image: true } },
          },
        },
        category: { select: { id: true, name: true, color: true } },
        commerce: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true,
            user: {
              select: {
                username: true,
                reviewsReceived: { select: { rating: true } },
              },
            },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Producto no encontrado');
    return { data: attachProductRating(product) };
  }

  async createOrder(dto: CreateCatalogOrderDto, requesterId: string) {
    // productName/commerceName/unitPrice se derivan siempre del producto
    // real, nunca del body: el cliente no debe poder falsificar a qué
    // comercio llega el pedido ni el monto que ve el comercio en la
    // notificación.
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, price: true, status: true, forSale: true,
        isBundle: true, commerceId: true, commerce: { select: { name: true } },
        bundleItems: { select: { componentProductId: true, quantity: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // minStock de los componentes reales a descontar (no de los items del pedido,
    // que pueden ser bundles): necesario para recalcular status tras el decrement.
    const componentIds = new Set<string>();
    for (const item of dto.items) {
      const product = byId.get(item.productId);
      if (product?.isBundle) {
        for (const c of product.bundleItems) componentIds.add(c.componentProductId);
      } else if (product) {
        componentIds.add(item.productId);
      }
    }
    const componentMinStocks = await this.prisma.product.findMany({
      where: { id: { in: [...componentIds] } },
      select: { id: true, minStock: true, name: true },
    });
    const minStockById = new Map(componentMinStocks.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = byId.get(item.productId);
      if (!product || !product.forSale || product.status !== ProductStatus.AVAILABLE) {
        throw new NotFoundException('Producto no disponible');
      }
      if (product.commerceId !== dto.commerceId) {
        throw new BadRequestException('El producto no pertenece a este comercio');
      }
    }

    // Resuelve cada item a las líneas de stock que realmente hay que
    // descontar: un producto normal descuenta de sí mismo; un pack
    // (isBundle) descuenta de sus componentes, multiplicando por la
    // cantidad pedida del pack.
    const stockDeductions = new Map<string, number>();
    for (const item of dto.items) {
      const product = byId.get(item.productId)!;
      if (product.isBundle) {
        for (const component of product.bundleItems) {
          const needed = component.quantity * item.quantity;
          stockDeductions.set(
            component.componentProductId,
            (stockDeductions.get(component.componentProductId) ?? 0) + needed
          );
        }
      } else {
        stockDeductions.set(item.productId, (stockDeductions.get(item.productId) ?? 0) + item.quantity);
      }
    }

    const commerceName = products[0].commerce.name;
    const totalEstimate = Math.round(
      dto.items.reduce((sum, item) => sum + byId.get(item.productId)!.price * item.quantity, 0) * 100
    ) / 100;

    // Pago Protegido (escrow) — solo si el comercio lo activó en Settings
    // (CommerceSettings.requiresEscrowForCatalogOrders). A diferencia de
    // ServiceRequest (donde el precio se fija después y puede quedar
    // PENDING_FUNDS con reintento), acá el monto ya se conoce al crear el
    // pedido: se retiene ANTES de tocar stock, y si no hay saldo el pedido
    // simplemente no se crea — no tiene sentido un pedido de catálogo sin
    // garantizar el pago primero, a diferencia de una negociación de servicio.
    const commerce = await this.prisma.commerce.findUnique({
      where: { id: dto.commerceId },
      select: { userId: true, settings: { select: { requiresEscrowForCatalogOrders: true } } },
    });
    const requiresEscrow = commerce?.settings?.requiresEscrowForCatalogOrders ?? false;
    if (requiresEscrow && !requesterId) {
      throw new BadRequestException(
        'Este comercio requiere pago protegido; debes estar autenticado con una billetera para completar el pedido.'
      );
    }

    // El id se genera acá (en vez de dejar que Prisma lo asigne en el
    // create) para poder retener el escrow ANTES de tocar stock, usando ya
    // el id real como Escrow.entityId — evita cualquier id provisorio que
    // después haya que re-vincular.
    const orderId = uuidv4();

    let escrowAmount: number | null = null;
    let platformFeeRate: number | null = null;
    let platformFeeAmount: number | null = null;
    if (requiresEscrow && commerce) {
      const feeConfig = await this.platformFees.resolveFeeConfig('CATALOG_ORDER', commerce.userId);
      escrowAmount = totalEstimate;
      if (feeConfig?.payer === 'CLIENT') {
        const { feeAmount } = this.platformFees.calculateFee(totalEstimate, feeConfig);
        escrowAmount = totalEstimate + feeAmount;
        platformFeeRate = feeConfig.rate;
        platformFeeAmount = feeAmount;
      }
      try {
        await this.escrow.hold({
          entityType: 'CATALOG_ORDER',
          entityId: orderId,
          payerId: requesterId,
          payeeId: commerce.userId,
          deltaAmount: escrowAmount,
        });
      } catch (err) {
        if (err instanceof InsufficientEscrowFundsError) {
          throw new BadRequestException('No tienes saldo suficiente en tu billetera para este pedido con pago protegido.');
        }
        throw err;
      }
    }

    const lowStockAlerts: { name: string; stock: number }[] = [];

    let order;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        // Descuenta stock de todos los componentes de forma atómica. Un
        // updateMany condicionado a stock >= needed es la forma de hacer un
        // "decrement con guard" en Postgres sin SELECT ... FOR UPDATE
        // explícito: si count queda en 0, alguien más se adelantó o no
        // alcanza — se aborta la transacción completa (rollback de todo lo
        // ya descontado en este mismo loop).
        for (const [componentId, needed] of stockDeductions) {
          const result = await tx.product.updateMany({
            where: { id: componentId, stock: { gte: needed } },
            data: { stock: { decrement: needed } },
          });
          if (result.count === 0) {
            throw new BadRequestException('Stock insuficiente para completar el pedido');
          }

          // Recalcula status igual que el ajuste manual (menu.service.ts updateStock):
          // sin esto el producto puede quedar en stock 0 mostrándose como AVAILABLE.
          const updated = await tx.product.findUnique({
            where: { id: componentId },
            select: { stock: true },
          });
          const meta = minStockById.get(componentId);
          if (updated && meta) {
            const newStatus =
              updated.stock === 0
                ? ProductStatus.OUT_OF_STOCK
                : updated.stock <= meta.minStock
                  ? ProductStatus.LOW_STOCK
                  : ProductStatus.AVAILABLE;
            await tx.product.update({ where: { id: componentId }, data: { status: newStatus } });
            if (newStatus !== ProductStatus.AVAILABLE) {
              lowStockAlerts.push({ name: meta.name, stock: updated.stock });
            }
          }
        }

        const created = await tx.catalogOrder.create({
          data: {
            id: orderId,
            commerceId: dto.commerceId,
            commerceName,
            deliveryType: dto.deliveryType,
            address: dto.address,
            city: dto.city,
            buyerName: dto.buyerName,
            buyerPhone: dto.buyerPhone,
            buyerEmail: dto.buyerEmail,
            notes: dto.notes,
            totalEstimate,
            requesterId,
            ...(requiresEscrow
              ? { escrowStatus: 'HELD' as const, escrowAmount, platformFeeRate, platformFeeAmount }
              : {}),
            items: {
              create: dto.items.map((item) => {
                const product = byId.get(item.productId)!;
                return {
                  productId: item.productId,
                  productName: product.name,
                  unitPrice: product.price,
                  quantity: item.quantity,
                  isBundle: product.isBundle,
                };
              }),
            },
          },
          include: { items: true },
        });

        // Cache desnormalizado para "más vendidos" (ver getProductsSortedByBestSeller).
        for (const item of dto.items) {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { salesCount: { increment: item.quantity } },
          });
        }

        return created;
      });
    } catch (err) {
      // El escrow ya se retuvo ANTES de esta transacción (para no descontar
      // stock sin garantía de pago) — si la transacción de stock/creación
      // falla por cualquier motivo (ej. otro comprador se adelantó y agotó
      // el stock entre el hold y acá), hay que devolver el dinero: el
      // comprador no debe quedar con una garantía retenida por un pedido
      // que nunca se creó.
      if (requiresEscrow && commerce) {
        await this.escrow
          .refund({ entityType: 'CATALOG_ORDER', entityId: orderId, payerId: requesterId, amount: escrowAmount! })
          .catch(() => {});
      }
      throw err;
    }

    // Notificar al comercio (fire-and-forget)
    const summary = order.items.length === 1
      ? order.items[0].productName
      : `${order.items.length} productos`;
    this.notifications
      .notifyNewCatalogOrder(
        order.commerceId,
        order.buyerName,
        summary,
        order.items.reduce((sum, i) => sum + i.quantity, 0),
        order.totalEstimate ?? undefined
      )
      .catch(() => {});
    for (const alert of lowStockAlerts) {
      this.notifications
        .notifyLowStock(order.commerceId, alert.name, alert.stock)
        .catch(() => {});
    }
    return { data: order };
  }

  async getOrdersForCommerce(
    commerceId: string,
    query?: { status?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, query?.limit ?? 50);
    const skip = (page - 1) * limit;

    const where: any = { commerceId };
    if (query?.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      this.prisma.catalogOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.catalogOrder.count({ where }),
    ]);
    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Pedidos enviados por el comprador (vista del lado cliente, no del comercio)
  async getOrdersSentByRequester(
    requesterId: string,
    query?: { status?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, query?.limit ?? 50);
    const skip = (page - 1) * limit;

    const where: any = { requesterId };
    if (query?.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      this.prisma.catalogOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.catalogOrder.count({ where }),
    ]);
    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private static readonly CATALOG_ORDER_TERMINAL_STATUSES = ['CLOSED', 'CANCELLED'];

  async updateOrderStatus(
    id: string,
    commerceId: string,
    status: CatalogOrderStatus
  ) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.commerceId !== commerceId) throw new ForbiddenException();
    if (CatalogService.CATALOG_ORDER_TERMINAL_STATUSES.includes(order.status)) {
      throw new ForbiddenException(`No puedes cambiar el estado de un pedido ${order.status}`);
    }
    // CLOSED es exclusivo del comprador vía confirmOrderCompletion (ahí se
    // libera el escrow y se cobra la comisión) — mismo criterio que
    // ServiceRequest, para que la comisión siempre se cobre al cerrar.
    if (status === 'CLOSED') {
      throw new ForbiddenException('Solo el comprador puede confirmar la finalización de un pedido');
    }

    const update: any = { status };
    // El comercio cancela: si había pago protegido retenido, se reembolsa al
    // comprador — un pedido cancelado nunca debe dejar dinero retenido sin
    // motivo. defensa en profundidad: hoy CANCELLED solo es alcanzable desde
    // PENDING/SEEN/CONTACTED (no terminal), así que esto siempre aplica
    // cuando corresponde.
    if (status === 'CANCELLED' && order.escrowStatus === 'HELD' && order.escrowAmount && order.requesterId) {
      await this.escrow.refund({
        entityType: 'CATALOG_ORDER',
        entityId: id,
        payerId: order.requesterId,
        amount: order.escrowAmount,
      });
      update.escrowStatus = 'REFUNDED';
    }

    const updated = await this.prisma.catalogOrder.update({ where: { id }, data: update });
    return { data: updated };
  }

  // El comprador (requester) confirma que recibió el pedido. Solo desde
  // CONTACTED, y habilita la reseña verificada del comercio. Libera el
  // escrow al comercio (menos la comisión de plataforma si la paga el
  // comercio) — mismo patrón que ServicesService.confirmServiceRequestCompletion.
  async confirmOrderCompletion(id: string, requesterId: string) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.requesterId !== requesterId) throw new ForbiddenException();
    if (order.status !== 'CONTACTED')
      throw new ForbiddenException(
        'Solo puedes confirmar un pedido que ya fue contactado por el comercio',
      );

    const update: any = { status: 'CLOSED' };

    if (order.escrowStatus === 'HELD' && order.escrowAmount) {
      const commerce = await this.prisma.commerce.findUnique({
        where: { id: order.commerceId },
        select: { userId: true },
      });
      let releaseAmount = order.escrowAmount;

      // Si el fee no se cobró al comprador al crear el pedido (platformFeeRate
      // null), lo paga el comercio ahora, descontado de lo liberado — mismo
      // criterio que ServiceRequest: el fee se cobra siempre, nunca se
      // duplica ni se omite.
      if (commerce && !order.platformFeeRate) {
        const feeConfig = await this.platformFees.resolveFeeConfig('CATALOG_ORDER', commerce.userId);
        if (feeConfig?.payer === 'PROVIDER') {
          const { feeAmount } = this.platformFees.calculateFee(order.escrowAmount, feeConfig);
          await this.platformFees.chargeProviderFee(
            'CATALOG_ORDER',
            commerce.userId,
            feeAmount,
            `FEE-CATALOG-${id}`,
            { catalogOrderId: id },
          );
          releaseAmount = order.escrowAmount - feeAmount;
          update.platformFeeRate = feeConfig.rate;
          update.platformFeeAmount = feeAmount;
        }
      }

      if (commerce && releaseAmount > 0) {
        await this.escrow.release({
          entityType: 'CATALOG_ORDER',
          entityId: id,
          payeeId: commerce.userId,
          amount: releaseAmount,
        });
      }
      update.escrowStatus = 'RELEASED';
    }

    const updated = await this.prisma.catalogOrder.update({ where: { id }, data: update });
    return { data: updated };
  }

  // El comprador O el comercio pueden disputar un pedido con garantía
  // retenida (HELD) cuando no están de acuerdo con cómo terminó — congela
  // la liberación/reembolso automáticos hasta que un admin la resuelva.
  async disputeOrder(id: string, userId: string, reason: string) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const commerce = await this.prisma.commerce.findUnique({
      where: { id: order.commerceId },
      select: { userId: true },
    });
    if (order.requesterId !== userId && commerce?.userId !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }
    if (order.status !== 'CONTACTED') {
      throw new BadRequestException('Solo se puede disputar un pedido en curso (contactado)');
    }

    const dispute = await this.escrow.openDispute({
      entityType: 'CATALOG_ORDER',
      entityId: id,
      raisedById: userId,
      reason,
    });

    const counterpartyId = userId === order.requesterId ? commerce?.userId : order.requesterId;
    if (counterpartyId) {
      this.notifications
        .notifyEscrowDisputeOpened(counterpartyId, order.commerceName)
        .catch(() => {});
    }

    return dispute;
  }
}
