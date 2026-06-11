import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, CatalogOrderStatus } from '@prisma/client';
import { QueryCatalogDto, CatalogSortBy } from './dto/query-catalog.dto';
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto';
import { NotificationsService } from '../notifications/notifications.service';

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
    // Return distinct category names that have at least 1 DISPONIBLE product for sale
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { status: ProductStatus.DISPONIBLE, forSale: true },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.DISPONIBLE, forSale: true } },
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

  async getRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        products: {
          some: { status: ProductStatus.DISPONIBLE, forSale: true },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.DISPONIBLE, forSale: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        productCount: r._count.products,
      })),
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
      status: ProductStatus.DISPONIBLE,
      forSale: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { commerce: { name: { contains: search, mode: 'insensitive' } } },
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
   * Ordena por calificación promedio del comercio (Review.targetId = Restaurant.userId).
   * Se calcula en memoria porque el rating no es un campo persistido del producto.
   */
  private async getProductsSortedByRating(
    where: Record<string, unknown>,
    page: number,
    limit: number
  ) {
    const allMatching = await this.prisma.product.findMany({
      where,
      select: { id: true, ...this.productSelectWithoutId },
    });

    const total = allMatching.length;
    const ratingOf = (p: (typeof allMatching)[number]) => {
      const reviews = p.commerce.user.reviewsReceived;
      return reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : -1; // sin reseñas va al final
    };

    const sorted = [...allMatching].sort((a, b) => ratingOf(b) - ratingOf(a));
    const skip = (page - 1) * limit;
    const pageItems = sorted.slice(skip, skip + limit);

    return {
      data: pageItems.map(attachProductRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Ordena por unidades solicitadas (suma de quantity en CatalogOrder).
   */
  private async getProductsSortedByBestSeller(
    where: Record<string, unknown>,
    page: number,
    limit: number
  ) {
    const [allMatching, salesGroups] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: { id: true, ...this.productSelectWithoutId },
      }),
      this.prisma.catalogOrder.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
      }),
    ]);

    const salesByProduct = new Map<string, number>(
      salesGroups.map((g) => [g.productId, g._sum.quantity ?? 0])
    );

    const total = allMatching.length;
    const sorted = [...allMatching].sort(
      (a, b) => (salesByProduct.get(b.id) ?? 0) - (salesByProduct.get(a.id) ?? 0)
    );
    const skip = (page - 1) * limit;
    const pageItems = sorted.slice(skip, skip + limit);

    return {
      data: pageItems.map(attachProductRating),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private get productSelectWithoutId() {
    const { id, ...rest } = this.productSelect;
    return rest;
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: ProductStatus.DISPONIBLE, forSale: true },
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

  async createOrder(dto: CreateCatalogOrderDto, requesterId?: string) {
    const { commerceName, ...rest } = dto;
    const order = await this.prisma.catalogOrder.create({
      data: {
        ...rest,
        restaurantName: commerceName,
        requesterId: requesterId ?? null,
      },
    });
    // Notificar al comercio (fire-and-forget)
    this.notifications
      .notifyNewCatalogOrder(
        dto.commerceId,
        dto.buyerName,
        dto.productName,
        dto.quantity,
        dto.totalEstimate
      )
      .catch(() => {});
    return { data: order };
  }

  async getOrdersForRestaurant(
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
}
