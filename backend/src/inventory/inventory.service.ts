import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto'

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name_restaurantId: { name: dto.name, restaurantId } },
    })
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre')

    return this.prisma.category.create({
      data: { ...dto, restaurantId },
    })
  }

  async updateCategory(restaurantId: string, categoryId: string, dto: UpdateCategoryDto) {
    await this.findCategoryOrFail(restaurantId, categoryId)

    if (dto.name) {
      const conflict = await this.prisma.category.findFirst({
        where: { name: dto.name, restaurantId, NOT: { id: categoryId } },
      })
      if (conflict) throw new ConflictException('Ya existe una categoría con ese nombre')
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    })
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    await this.findCategoryOrFail(restaurantId, categoryId)

    const hasProducts = await this.prisma.product.count({ where: { categoryId } })
    if (hasProducts > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría que tiene productos asociados',
      )
    }

    await this.prisma.category.delete({ where: { id: categoryId } })
    return { message: 'Categoría eliminada correctamente' }
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(restaurantId: string) {
    return this.prisma.product.findMany({
      where: { restaurantId },
      include: { category: true },
      orderBy: { name: 'asc' },
    })
  }

  async getProduct(restaurantId: string, productId: string) {
    return this.findProductOrFail(restaurantId, productId)
  }

  async createProduct(restaurantId: string, dto: CreateProductDto) {
    await this.findCategoryOrFail(restaurantId, dto.categoryId)

    const status = this.computeStatus(dto.stock, dto.minStock ?? 5)

    return this.prisma.product.create({
      data: {
        ...dto,
        status,
        restaurantId,
        ingredients: dto.ingredients ?? [],
        allergens: dto.allergens ?? [],
      },
      include: { category: true },
    })
  }

  async updateProduct(restaurantId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findProductOrFail(restaurantId, productId)

    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.findCategoryOrFail(restaurantId, dto.categoryId)
    }

    const newStock = dto.stock ?? product.stock
    const newMinStock = dto.minStock ?? product.minStock
    const status = dto.status ?? this.computeStatus(newStock, newMinStock)

    return this.prisma.product.update({
      where: { id: productId },
      data: { ...dto, status },
      include: { category: true },
    })
  }

  async updateStock(restaurantId: string, productId: string, dto: UpdateStockDto) {
    const product = await this.findProductOrFail(restaurantId, productId)

    let newStock: number
    if (dto.type === StockUpdateType.ADD) {
      newStock = product.stock + dto.quantity
    } else if (dto.type === StockUpdateType.SUBTRACT) {
      newStock = Math.max(0, product.stock - dto.quantity)
    } else {
      newStock = dto.quantity
    }

    const status = this.computeStatus(newStock, product.minStock)

    return this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock, status },
      include: { category: true },
    })
  }

  async deleteProduct(restaurantId: string, productId: string) {
    await this.findProductOrFail(restaurantId, productId)
    await this.prisma.product.delete({ where: { id: productId } })
    return { message: 'Producto eliminado correctamente' }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private computeStatus(stock: number, minStock: number): ProductStatus {
    if (stock === 0) return ProductStatus.AGOTADO
    if (stock <= minStock) return ProductStatus.BAJO_STOCK
    return ProductStatus.DISPONIBLE
  }

  private async findCategoryOrFail(restaurantId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
    })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    return category
  }

  private async findProductOrFail(restaurantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      include: { category: true },
    })
    if (!product) throw new NotFoundException('Producto no encontrado')
    return product
  }
}
