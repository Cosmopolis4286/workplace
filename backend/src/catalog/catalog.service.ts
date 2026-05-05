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
      page = 1,
      limit = 20,
      sort = CatalogSortBy.RELEVANCE,
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
          category: {
            select: { id: true, name: true, color: true },
          },
          commerce: {
            select: {
              id: true,
              name: true,
              type: true,
              user: {
                select: {
                  username: true,
                  reviewsReceived: { select: { rating: true } },
                },
              },
            },
          },
        },
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
