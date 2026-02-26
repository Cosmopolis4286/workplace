import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto'

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!restaurant) throw new ForbiddenException('El usuario no tiene un restaurante asociado')
    return restaurant.id
  }

  private async assertCategoryOwnership(categoryId: string, restaurantId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    if (category.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return category
  }

  private async assertProductOwnership(productId: string, restaurantId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new NotFoundException('Producto no encontrado')
    if (product.restaurantId !== restaurantId) throw new ForbiddenException('Acceso denegado')
    return product
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.prisma.category.findMany({
      where: { restaurantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const restaurantId = await this.getRestaurantId(userId)
    const exists = await this.prisma.category.findUnique({
      where: { name_restaurantId: { name: dto.name, restaurantId } },
    })
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre')

    return this.prisma.category.create({
      data: { ...dto, restaurantId },
    })
  }

  async updateCategory(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertCategoryOwnership(categoryId, restaurantId)

    if (dto.name) {
      const exists = await this.prisma.category.findUnique({
        where: { name_restaurantId: { name: dto.name, restaurantId } },
      })
      if (exists && exists.id !== categoryId)
        throw new ConflictException('Ya existe una categoría con ese nombre')
    }

    return this.prisma.category.update({ where: { id: categoryId }, data: dto })
  }

  async deleteCategory(userId: string, categoryId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertCategoryOwnership(categoryId, restaurantId)

    const productCount = await this.prisma.product.count({ where: { categoryId } })
    if (productCount > 0)
      throw new ConflictException('No se puede eliminar una categoría con productos. Mueve o elimina los productos primero.')

    await this.prisma.category.delete({ where: { id: categoryId } })
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(userId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    return this.prisma.product.findMany({
      where: { restaurantId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async getProductsByCategory(userId: string, categoryId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertCategoryOwnership(categoryId, restaurantId)
    return this.prisma.product.findMany({
      where: { restaurantId, categoryId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertCategoryOwnership(dto.categoryId, restaurantId)

    const { categoryId, ...rest } = dto
    return this.prisma.product.create({
      data: { ...rest, categoryId, restaurantId },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertProductOwnership(productId, restaurantId)

    if (dto.categoryId) {
      await this.assertCategoryOwnership(dto.categoryId, restaurantId)
    }

    const { categoryId, ...rest } = dto
    return this.prisma.product.update({
      where: { id: productId },
      data: { ...rest, ...(categoryId ? { categoryId } : {}) },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async deleteProduct(userId: string, productId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    await this.assertProductOwnership(productId, restaurantId)
    await this.prisma.product.delete({ where: { id: productId } })
  }

  async updateStock(userId: string, productId: string, dto: UpdateStockDto) {
    const restaurantId = await this.getRestaurantId(userId)
    const product = await this.assertProductOwnership(productId, restaurantId)

    let newStock: number
    if (dto.type === StockUpdateType.ADD) {
      newStock = product.stock + dto.quantity
    } else if (dto.type === StockUpdateType.SUBTRACT) {
      newStock = Math.max(0, product.stock - dto.quantity)
    } else {
      newStock = dto.quantity
    }

    let newStatus: ProductStatus
    if (newStock === 0) newStatus = ProductStatus.AGOTADO
    else if (newStock <= product.minStock) newStatus = ProductStatus.BAJO_STOCK
    else newStatus = ProductStatus.DISPONIBLE

    return this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock, status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async toggleProductStatus(userId: string, productId: string) {
    const restaurantId = await this.getRestaurantId(userId)
    const product = await this.assertProductOwnership(productId, restaurantId)

    const newStatus = product.status === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE'
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }
}
