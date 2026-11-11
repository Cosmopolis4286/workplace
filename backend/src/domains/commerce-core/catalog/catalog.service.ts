import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CatalogOrderStatus,
  NotificationType,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { QueryCatalogDto, CatalogSortBy } from './dto/query-catalog.dto';
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { tagSearchCondition } from '../../../common/utils/tags.util';
import { EscrowFacade, ESCROW_FACADE } from '../../money/escrow/escrow.facade';
import {
  PlatformFeesFacade,
  PLATFORM_FEES_FACADE,
} from '../../money/platform-fees/platform-fees.facade';
import { InsufficientEscrowFundsError } from '../../money/wallets/wallet.errors';
import { v4 as uuidv4 } from 'uuid';
import { features } from '../../../common/config/features';

import {
  add,
  gt,
  isPositive,
  mul,
  round,
  sub,
  sum,
  toDecimal,
  toNumber,
} from '../../../common/money/money';

function withoutWhatsapp(links: Prisma.JsonValue | null) {
  if (!links || typeof links !== 'object' || Array.isArray(links)) return links;
  const { whatsapp: _hidden, ...others } = links as Record<string, unknown>;
  return others as Prisma.JsonValue;
}

// Plazo del comprador para confirmar o reportar tras "entregado".
export const CATALOG_AUTO_CLOSE_HOURS = 72;

function attachProductRating<
  T extends {
    commerce: {
      user: { reviewsReceived: { rating: number }[]; [k: string]: any };
      [k: string]: any;
    };
    [k: string]: any;
  },
>(product: T) {
  const reviews = product.commerce.user.reviewsReceived;
  const rating = reviews.length
    ? Number(
        (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2)
      )
    : null;
  const reviewsCount = reviews.length;
  const { reviewsReceived: _, ...userWithoutReviews } = product.commerce.user;
  return {
    ...product,
    commerce: {
      ...product.commerce,
      user: { ...userWithoutReviews, rating, reviewsCount },
    },
  };
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

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
            products: {
              where: { status: ProductStatus.AVAILABLE, forSale: true },
            },
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
  async getPopularTags(
    q?: string,
    limit = 20
  ): Promise<{ tag: string; count: number }[]> {
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
            products: {
              where: { status: ProductStatus.AVAILABLE, forSale: true },
            },
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
        showPublicContact: true,
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
            products: {
              where: { status: ProductStatus.AVAILABLE, forSale: true },
            },
          },
        },
      },
    });

    // Mismo criterio de "no encontrado" tanto si el slug no existe como si
    // el dueño la ocultó — evita filtrar a un visitante que una tienda con
    // ese slug existe pero está oculta.
    if (
      !commerce ||
      (!commerce.isPublic && commerce.userId !== currentUserId)
    ) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const { _count, userId, user, showPublicContact, ...store } = commerce;
    // Contacto directo de la tienda: solo si lo permiten el admin (ajuste
    // global store.publicContact) y el propio comercio.
    const platformAllows = await this.isPublicStoreContactAllowed();
    const rest =
      platformAllows && showPublicContact
        ? store
        : {
            ...store,
            phone: null,
            email: null,
            socialLinks: withoutWhatsapp(store.socialLinks),
          };
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
      return this.getProductsNearMe(
        where,
        { country, state, city },
        page,
        limit,
        sort
      );
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

    const tiers: {
      tier: 'city' | 'state' | 'country';
      commerce: Record<string, unknown>;
    }[] = [];
    if (city)
      tiers.push({
        tier: 'city',
        commerce: { city: { equals: city, mode: 'insensitive' } },
      });
    if (state)
      tiers.push({
        tier: 'state',
        commerce: { state: { equals: state, mode: 'insensitive' } },
      });
    if (country)
      tiers.push({
        tier: 'country',
        commerce: { country: { equals: country, mode: 'insensitive' } },
      });

    for (const { tier, commerce } of tiers) {
      const where = { ...baseWhere, commerce };

      if (sort === CatalogSortBy.RATING_DESC) {
        const result = await this.getProductsSortedByRating(where, page, limit);
        if (result.total > 0) return { ...result, locationTier: tier };
        continue;
      }
      if (sort === CatalogSortBy.BEST_SELLER) {
        const result = await this.getProductsSortedByBestSeller(
          where,
          page,
          limit
        );
        if (result.total > 0) return { ...result, locationTier: tier };
        continue;
      }

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
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      locationTier: null,
    };
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
            componentProduct: {
              select: { id: true, name: true, price: true, image: true },
            },
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
        id: true,
        name: true,
        price: true,
        status: true,
        forSale: true,
        isBundle: true,
        commerceId: true,
        commerce: { select: { name: true } },
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
        for (const c of product.bundleItems)
          componentIds.add(c.componentProductId);
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
      if (
        !product ||
        !product.forSale ||
        product.status !== ProductStatus.AVAILABLE
      ) {
        throw new NotFoundException('Producto no disponible');
      }
      if (product.commerceId !== dto.commerceId) {
        throw new BadRequestException(
          'El producto no pertenece a este comercio'
        );
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
        stockDeductions.set(
          item.productId,
          (stockDeductions.get(item.productId) ?? 0) + item.quantity
        );
      }
    }

    const commerceName = products[0].commerce.name;
    const totalEstimate = sum(
      dto.items.map((item) =>
        round(mul(byId.get(item.productId)!.price, item.quantity))
      )
    );

    // Pago Protegido (escrow) — solo si el comercio lo activó en Settings
    // (CommerceSettings.requiresEscrowForCatalogOrders). A diferencia de
    // ServiceRequest (donde el precio se fija después y puede quedar
    // PENDING_FUNDS con reintento), acá el monto ya se conoce al crear el
    // pedido: se retiene ANTES de tocar stock, y si no hay saldo el pedido
    // simplemente no se crea — no tiene sentido un pedido de catálogo sin
    // garantizar el pago primero, a diferencia de una negociación de servicio.
    const commerce = await this.prisma.commerce.findUnique({
      where: { id: dto.commerceId },
      select: {
        userId: true,
        settings: { select: { requiresEscrowForCatalogOrders: true } },
      },
    });
    // Con el Pago Protegido apagado el pedido sigue sin garantía (pago directo
    // al comercio), aunque el comercio la tenga configurada.
    const requiresEscrow =
      features.protectedPayments() &&
      (commerce?.settings?.requiresEscrowForCatalogOrders ?? false);
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

    let escrowAmount: Prisma.Decimal | null = null;
    let platformFeeRate: number | null = null;
    let platformFeeAmount: number | null = null;
    if (requiresEscrow && commerce) {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'CATALOG_ORDER',
        commerce.userId
      );
      escrowAmount = totalEstimate;
      if (feeConfig?.payer === 'CLIENT') {
        const { feeAmount } = this.platformFees.calculateFee(
          totalEstimate,
          feeConfig
        );
        escrowAmount = add(totalEstimate, feeAmount);
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
          throw new BadRequestException(
            'No tienes saldo suficiente en tu billetera para este pedido con pago protegido.'
          );
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
            throw new BadRequestException(
              'Stock insuficiente para completar el pedido'
            );
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
            await tx.product.update({
              where: { id: componentId },
              data: { status: newStatus },
            });
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
              ? {
                  escrowStatus: 'HELD' as const,
                  escrowAmount,
                  platformFeeRate,
                  platformFeeAmount,
                }
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
          .refund({
            entityType: 'CATALOG_ORDER',
            entityId: orderId,
            payerId: requesterId,
            amount: escrowAmount!,
          })
          .catch(() => {});
      }
      throw err;
    }

    // Notificar al comercio (fire-and-forget)
    const summary =
      order.items.length === 1
        ? order.items[0].productName
        : `${order.items.length} productos`;
    this.notifications
      .notifyNewCatalogOrder(
        order.commerceId,
        order.buyerName,
        summary,
        order.items.reduce((sum, i) => sum + i.quantity, 0),
        order.totalEstimate == null ? undefined : toNumber(order.totalEstimate)
      )
      .catch(() => {});
    for (const alert of lowStockAlerts) {
      this.notifications
        .notifyLowStock(order.commerceId, alert.name, alert.stock)
        .catch(() => {});
    }
    return { data: order };
  }

  private async isPublicStoreContactAllowed() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: 'store.publicContact' },
    });
    return row ? row.value !== false : true;
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
    // La conversación con el comprador va por el chat del pedido: el comercio
    // no recibe su teléfono ni su correo. La dirección sí (la necesita para
    // entregar).
    return {
      data: orders.map((o) => ({
        ...o,
        buyerPhone: null,
        buyerEmail: null,
        contactHidden: true,
      })),
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

  private static readonly CATALOG_ORDER_TERMINAL_STATUSES = [
    'CLOSED',
    'CANCELLED',
  ];

  async updateOrderStatus(
    id: string,
    commerceId: string,
    status: CatalogOrderStatus
  ) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.commerceId !== commerceId) throw new ForbiddenException();
    if (CatalogService.CATALOG_ORDER_TERMINAL_STATUSES.includes(order.status)) {
      throw new ForbiddenException(
        `No puedes cambiar el estado de un pedido ${order.status}`
      );
    }
    // CLOSED es exclusivo del comprador vía confirmOrderCompletion (ahí se
    // libera el escrow y se cobra la comisión) — mismo criterio que
    // ServiceRequest, para que la comisión siempre se cobre al cerrar.
    if (status === 'CLOSED') {
      throw new ForbiddenException(
        'Solo el comprador puede confirmar la finalización de un pedido'
      );
    }

    if (status === 'CANCELLED') {
      return { data: await this.cancelOrder(order) };
    }
    const updated = await this.prisma.catalogOrder.update({
      where: { id },
      data: { status, statusUpdatedAt: new Date() },
    });
    return { data: updated };
  }

  // El comprador cancela su pedido mientras el comercio todavía no lo
  // atendió (PENDING/SEEN). Antes no podía: si el comercio nunca respondía,
  // la garantía quedaba retenida sin salida.
  async cancelOrderByBuyer(id: string, requesterId: string) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.requesterId !== requesterId) throw new ForbiddenException();
    if (order.status !== 'PENDING' && order.status !== 'SEEN') {
      throw new BadRequestException(
        'Solo puedes cancelar un pedido que el comercio todavía no atendió'
      );
    }
    return { data: await this.cancelOrder(order) };
  }

  /**
   * Cancela un pedido: reembolsa la garantía retenida (si hay) y devuelve el
   * stock que se descontó al crearlo. Lo usan el comercio, el comprador y la
   * expiración automática. Un pedido en disputa no se toca: lo resuelve un admin.
   */
  private async cancelOrder(order: {
    id: string;
    status: CatalogOrderStatus;
    escrowStatus: string;
    escrowAmount: Prisma.Decimal | null;
    requesterId: string | null;
  }) {
    if (order.escrowStatus === 'DISPUTED') {
      throw new BadRequestException(
        'El pedido tiene una disputa abierta; la resuelve un administrador'
      );
    }
    // Toma el pedido con un UPDATE condicionado al estado leído: dos
    // cancelaciones simultáneas (o cancelar + expirar) no reembolsan ni
    // devuelven stock dos veces.
    const claimed = await this.prisma.catalogOrder.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'CANCELLED', statusUpdatedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('El pedido ya cambió de estado');
    }

    await this.restoreStock(order.id).catch((err) =>
      this.logger.error(
        `No se pudo devolver el stock del pedido ${order.id}: ${(err as Error).message}`
      )
    );

    if (
      order.escrowStatus === 'HELD' &&
      isPositive(order.escrowAmount) &&
      order.requesterId
    ) {
      await this.escrow.refund({
        entityType: 'CATALOG_ORDER',
        entityId: order.id,
        payerId: order.requesterId,
        amount: order.escrowAmount!,
      });
      return this.prisma.catalogOrder.update({
        where: { id: order.id },
        data: { escrowStatus: 'REFUNDED' },
      });
    }
    return this.prisma.catalogOrder.findUnique({ where: { id: order.id } });
  }

  // Devuelve el stock descontado en createOrder (packs: a sus componentes) y
  // revierte el contador de "más vendidos".
  private async restoreStock(orderId: string) {
    const items = await this.prisma.catalogOrderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true, isBundle: true },
    });
    if (!items.length) return;

    const bundleIds = items.filter((i) => i.isBundle).map((i) => i.productId);
    const bundles = bundleIds.length
      ? await this.prisma.productBundleItem.findMany({
          where: { bundleProductId: { in: bundleIds } },
          select: {
            bundleProductId: true,
            componentProductId: true,
            quantity: true,
          },
        })
      : [];

    const restock = new Map<string, number>();
    for (const item of items) {
      if (item.isBundle) {
        for (const c of bundles.filter(
          (b) => b.bundleProductId === item.productId
        )) {
          restock.set(
            c.componentProductId,
            (restock.get(c.componentProductId) ?? 0) +
              c.quantity * item.quantity
          );
        }
      } else {
        restock.set(
          item.productId,
          (restock.get(item.productId) ?? 0) + item.quantity
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [productId, qty] of restock) {
        // updateMany: un producto borrado desde el pedido no rompe nada.
        await tx.product.updateMany({
          where: { id: productId },
          data: { stock: { increment: qty } },
        });
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true, minStock: true, status: true },
        });
        // Solo recalcula estados de stock; UNAVAILABLE lo puso el comercio.
        if (product && product.status !== ProductStatus.UNAVAILABLE) {
          const status =
            product.stock === 0
              ? ProductStatus.OUT_OF_STOCK
              : product.stock <= product.minStock
                ? ProductStatus.LOW_STOCK
                : ProductStatus.AVAILABLE;
          if (status !== product.status) {
            await tx.product.update({
              where: { id: productId },
              data: { status },
            });
          }
        }
      }
      for (const item of items) {
        await tx.product.updateMany({
          where: { id: item.productId, salesCount: { gte: item.quantity } },
          data: { salesCount: { decrement: item.quantity } },
        });
      }
    });
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
        'Solo puedes confirmar un pedido que ya fue contactado por el comercio'
      );
    return { data: await this.completeOrder(order) };
  }

  // Cierre del pedido: cobra la comisión y libera la garantía. Lo dispara
  // el comprador al confirmar o la auto-liberación por plazo.
  private async completeOrder(
    order: NonNullable<
      Awaited<ReturnType<PrismaService['catalogOrder']['findUnique']>>
    >
  ) {
    const id = order.id;
    // Toma el pedido (CONTACTED → CLOSED) antes de mover dinero: confirmar y
    // auto-liberar a la vez no cobran ni liberan dos veces.
    const claimed = await this.prisma.catalogOrder.updateMany({
      where: { id, status: 'CONTACTED', escrowStatus: order.escrowStatus },
      data: { status: 'CLOSED', statusUpdatedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('El pedido ya cambió de estado');
    }

    const update: any = { status: 'CLOSED' };
    const hasEscrow =
      order.escrowStatus === 'HELD' && isPositive(order.escrowAmount);
    const commerce = await this.prisma.commerce.findUnique({
      where: { id: order.commerceId },
      select: { userId: true },
    });

    // La comisión se cobra en todo pedido cerrado, con o sin garantía (antes
    // solo con garantía, y la mayoría de las ventas quedaban sin comisión).
    // - Ya cobrada al comprador al crear (payer CLIENT, platformFeeAmount):
    //   está dentro de la garantía y se queda en la plataforma; se libera al
    //   comercio solo el resto.
    // - Si no: se calcula ahora a cargo del comercio. Con garantía se
    //   descuenta de lo liberado (COLLECTED); sin garantía el comprador le
    //   pagó directo al comercio, así que va a su estado de cuenta (PENDING).
    let retainedFee = toDecimal(0);
    if (commerce && isPositive(order.platformFeeAmount)) {
      // Ya cobrada al comprador al crear (payer CLIENT): se registra como
      // cobrada (está dentro de la garantía) para que conste en la
      // contabilidad del comercio sin facturársela.
      retainedFee = toDecimal(order.platformFeeAmount!);
      await this.platformFees.chargeProviderFee(
        'CATALOG_ORDER',
        commerce.userId,
        toNumber(order.platformFeeAmount!),
        `FEE-CATALOG-${id}`,
        { catalogOrderId: id, payer: 'CLIENT' },
        { collected: true }
      );
    } else if (commerce && !isPositive(order.platformFeeRate)) {
      const feeConfig = await this.platformFees.resolveFeeConfig(
        'CATALOG_ORDER',
        commerce.userId
      );
      const base = hasEscrow ? order.escrowAmount : order.totalEstimate;
      if (feeConfig && isPositive(base)) {
        const { feeAmount } = this.platformFees.calculateFee(base!, feeConfig);
        await this.platformFees.chargeProviderFee(
          'CATALOG_ORDER',
          commerce.userId,
          feeAmount,
          `FEE-CATALOG-${id}`,
          { catalogOrderId: id },
          { collected: hasEscrow }
        );
        if (hasEscrow) retainedFee = toDecimal(feeAmount);
        update.platformFeeRate = feeConfig.rate;
        update.platformFeeAmount = feeAmount;
      }
    }

    if (hasEscrow) {
      const releaseAmount = sub(order.escrowAmount!, retainedFee);
      if (commerce && gt(releaseAmount, 0)) {
        await this.escrow.release({
          entityType: 'CATALOG_ORDER',
          entityId: id,
          payeeId: commerce.userId,
          amount: releaseAmount,
        });
      }
      update.escrowStatus = 'RELEASED';
    }

    return this.prisma.catalogOrder.update({
      where: { id },
      data: update,
    });
  }

  /**
   * Plazos de la garantía (cron cada hora):
   * - PENDING/SEEN sin respuesta del comercio en CATALOG_ESCROW_RESPONSE_DAYS
   *   (3 por defecto) → se cancela y se reembolsa al comprador.
   * - CONTACTED sin confirmación ni disputa del comprador en
   *   CATALOG_ESCROW_AUTO_RELEASE_DAYS (7 por defecto) → se cierra y se
   *   libera al comercio, como si el comprador confirmara.
   * Los pedidos en disputa no se tocan. Sin estos plazos el dinero podía
   * quedar retenido para siempre.
   */
  async enforceEscrowDeadlines(now = new Date()) {
    const days = (key: string, fallback: number) => {
      const value = Number(process.env[key]);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const before = (d: number) => new Date(now.getTime() - d * 86_400_000);
    const olderThan = (cutoff: Date) => ({
      OR: [
        { statusUpdatedAt: { lt: cutoff } },
        { statusUpdatedAt: null, createdAt: { lt: cutoff } },
      ],
    });

    const [unanswered, unconfirmed, delivered] = await Promise.all([
      // Sin respuesta del comercio: con o sin garantía (sin garantía, el
      // pedido igual tenía el stock reservado indefinidamente).
      this.prisma.catalogOrder.findMany({
        where: {
          escrowStatus: { in: ['HELD', 'NONE'] },
          status: { in: ['PENDING', 'SEEN'] },
          ...olderThan(before(days('CATALOG_ESCROW_RESPONSE_DAYS', 3))),
        },
        take: 100,
      }),
      this.prisma.catalogOrder.findMany({
        where: {
          escrowStatus: 'HELD',
          status: 'CONTACTED',
          ...olderThan(before(days('CATALOG_ESCROW_AUTO_RELEASE_DAYS', 7))),
        },
        take: 100,
      }),
      // El comercio marcó el pedido entregado y el comprador no confirmó ni
      // reportó en 72 h: se cierra (y se registra la comisión). Antes, sin
      // garantía, estos pedidos quedaban CONTACTED para siempre y la venta
      // nunca generaba comisión.
      this.prisma.catalogOrder.findMany({
        where: {
          escrowStatus: { in: ['HELD', 'NONE'] },
          status: 'CONTACTED',
          commerceCompletedAt: { lte: before(CATALOG_AUTO_CLOSE_HOURS / 24) },
        },
        take: 100,
      }),
    ]);

    let refunded = 0;
    let released = 0;
    for (const order of unanswered) {
      try {
        await this.cancelOrder(order);
        refunded++;
        if (order.requesterId) {
          const hadEscrow = order.escrowStatus === 'HELD';
          this.notifications
            .createForUser(order.requesterId, {
              type: NotificationType.ORDER,
              title: hadEscrow
                ? 'Pedido cancelado y reembolsado'
                : 'Pedido cancelado',
              message: hadEscrow
                ? `${order.commerceName} no respondió a tu pedido a tiempo. Te devolvimos el dinero a la billetera.`
                : `${order.commerceName} no respondió a tu pedido a tiempo, así que lo cancelamos.`,
              link: '/my-orders',
            })
            .catch(() => {});
        }
      } catch (err) {
        this.logger.warn(
          `No se pudo expirar el pedido ${order.id}: ${(err as Error).message}`
        );
      }
    }
    // Un reporte abierto del comprador frena el cierre automático: lo revisa
    // soporte antes de cobrar la comisión.
    const byId = new Map(
      [...unconfirmed, ...delivered].map((o) => [o.id, o] as const)
    );
    const reported = byId.size
      ? await this.prisma.report.findMany({
          where: {
            entityType: 'CATALOG_ORDER',
            entityId: { in: [...byId.keys()] },
            status: { in: ['PENDING', 'IN_REVIEW'] },
          },
          select: { entityId: true },
        })
      : [];
    for (const r of reported) if (r.entityId) byId.delete(r.entityId);

    for (const order of byId.values()) {
      try {
        await this.completeOrder(order);
        released++;
      } catch (err) {
        this.logger.warn(
          `No se pudo auto-liberar el pedido ${order.id}: ${(err as Error).message}`
        );
      }
    }
    return { refunded, released };
  }

  // El comercio avisa que entregó el pedido. El comprador tiene
  // CATALOG_AUTO_CLOSE_HOURS para confirmar o reportar un problema; si no hace
  // nada, enforceEscrowDeadlines lo cierra (registra la comisión y, si había
  // garantía, la libera).
  async markOrderDelivered(id: string, commerceId: string) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.commerceId !== commerceId) throw new ForbiddenException();
    if (order.status !== 'CONTACTED') {
      throw new BadRequestException(
        'Solo puedes marcar como entregado un pedido en curso (contactado)'
      );
    }
    if (order.escrowStatus === 'DISPUTED') {
      throw new BadRequestException(
        'Hay una disputa abierta: soporte la está revisando'
      );
    }
    if (order.commerceCompletedAt) return { data: order };

    const updated = await this.prisma.catalogOrder.update({
      where: { id },
      data: { commerceCompletedAt: new Date() },
    });
    if (order.requesterId) {
      this.notifications
        .createForUser(order.requesterId, {
          type: NotificationType.ORDER,
          title: 'Tu pedido fue entregado',
          message: `${order.commerceName} marcó tu pedido como entregado. Confírmalo o reporta un problema en las próximas ${CATALOG_AUTO_CLOSE_HOURS} h; si no, se cerrará automáticamente.`,
          link: '/my-orders',
        })
        .catch(() => {});
    }
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
      throw new BadRequestException(
        'Solo se puede disputar un pedido en curso (contactado)'
      );
    }

    const dispute = await this.escrow.openDispute({
      entityType: 'CATALOG_ORDER',
      entityId: id,
      raisedById: userId,
      reason,
    });

    const counterpartyId =
      userId === order.requesterId ? commerce?.userId : order.requesterId;
    if (counterpartyId) {
      this.notifications
        .notifyEscrowDisputeOpened(counterpartyId, order.commerceName)
        .catch(() => {});
    }

    return dispute;
  }
}
