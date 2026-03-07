import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ProductStatus } from '@prisma/client'
import { QueryCatalogDto, CatalogSortBy } from './dto/query-catalog.dto'
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto'

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getCategories() {
    // Return distinct category names that have at least 1 DISPONIBLE product
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { status: ProductStatus.DISPONIBLE },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.DISPONIBLE } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return {
      data: categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        productCount: c._count.products,
      })),
    }
  }

  async getRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        products: {
          some: { status: ProductStatus.DISPONIBLE },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            products: { where: { status: ProductStatus.DISPONIBLE } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return {
      data: restaurants.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        productCount: r._count.products,
      })),
    }
  }

  async getProducts(dto: QueryCatalogDto) {
    const { search, categoryName, restaurantId, page = 1, limit = 20, sort = CatalogSortBy.RELEVANCE } = dto
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      status: ProductStatus.DISPONIBLE,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { restaurant: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (categoryName) {
      where.category = { name: { equals: categoryName, mode: 'insensitive' } }
    }

    if (restaurantId) {
      where.restaurantId = restaurantId
    }

    let orderBy: Record<string, unknown> = { name: 'asc' }
    if (sort === CatalogSortBy.PRICE_ASC) orderBy = { price: 'asc' }
    else if (sort === CatalogSortBy.PRICE_DESC) orderBy = { price: 'desc' }
    else if (sort === CatalogSortBy.NAME) orderBy = { name: 'asc' }
    else orderBy = { createdAt: 'desc' } // relevance = newest first

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
          restaurant: {
            select: { id: true, name: true, type: true, user: { select: { username: true } } },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: ProductStatus.DISPONIBLE },
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
        restaurant: { select: { id: true, name: true, type: true, address: true, phone: true, user: { select: { username: true } } } },
      },
    })

    if (!product) throw new NotFoundException('Producto no encontrado')
    return { data: product }
  }

  async createOrder(dto: CreateCatalogOrderDto, requesterId?: string) {
    const order = await this.prisma.catalogOrder.create({
      data: { ...dto, requesterId: requesterId ?? null },
    })
    return { data: order }
  }

  async getOrdersForRestaurant(restaurantId: string) {
    const orders = await this.prisma.catalogOrder.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { data: orders }
  }
}
