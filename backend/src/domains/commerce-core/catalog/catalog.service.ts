import {
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
    private notifications: NotificationsService
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

  async getStoreBySlug(slug: string) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
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
        settings: {
          select: {
            avgPrepTime: true,
            avgDeliveryTime: true,
            deliveryFee: true,
            freeDeliveryMinimum: true,
          },
        },
        user: { select: { avatar: true, coverImage: true } },
        _count: {
          select: {
            products: { where: { status: ProductStatus.AVAILABLE, forSale: true } },
          },
        },
      },
    });

    if (!commerce) throw new NotFoundException('Tienda no encontrada');

    const { _count, ...rest } = commerce;
    return { data: { ...rest, productCount: _count.products } };
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
    // productName/commerceName/totalEstimate se derivan del producto real,
    // nunca del body: el cliente no debe poder falsificar a qué comercio
    // llega el pedido ni el monto que ve el comercio en la notificación.
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        name: true, price: true, status: true, forSale: true,
        commerceId: true, commerce: { select: { name: true } },
      },
    });
    if (!product || !product.forSale || product.status !== ProductStatus.AVAILABLE) {
      throw new NotFoundException('Producto no disponible');
    }
    if (product.commerceId !== dto.commerceId) {
      throw new BadRequestException('El producto no pertenece a este comercio');
    }

    const order = await this.prisma.catalogOrder.create({
      data: {
        ...dto,
        productName: product.name,
        commerceName: product.commerce.name,
        totalEstimate: Math.round(product.price * dto.quantity * 100) / 100,
        requesterId,
      },
    });
    // Cache desnormalizado para "más vendidos" (ver getProductsSortedByBestSeller).
    // updateMany en vez de update: productId no tiene FK hacia Product, así
    // que el producto pudo haber sido borrado sin romper el pedido histórico.
    await this.prisma.product.updateMany({
      where: { id: dto.productId },
      data: { salesCount: { increment: dto.quantity } },
    });
    // Notificar al comercio (fire-and-forget)
    this.notifications
      .notifyNewCatalogOrder(
        order.commerceId,
        order.buyerName,
        order.productName,
        order.quantity,
        order.totalEstimate ?? undefined
      )
      .catch(() => {});
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

  async updateOrderStatus(
    id: string,
    commerceId: string,
    status: CatalogOrderStatus
  ) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.commerceId !== commerceId) throw new ForbiddenException();
    const updated = await this.prisma.catalogOrder.update({
      where: { id },
      data: { status },
    });
    return { data: updated };
  }

  // El comprador (requester) confirma que recibió el pedido. Solo desde
  // CONTACTED, y habilita la reseña verificada del comercio.
  async confirmOrderCompletion(id: string, requesterId: string) {
    const order = await this.prisma.catalogOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.requesterId !== requesterId) throw new ForbiddenException();
    if (order.status !== 'CONTACTED')
      throw new ForbiddenException(
        'Solo puedes confirmar un pedido que ya fue contactado por el comercio',
      );
    const updated = await this.prisma.catalogOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
    return { data: updated };
  }
}
