import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly planLimits: PlanLimitsService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!restaurant)
      throw new ForbiddenException(
        'El usuario no tiene un restaurante asociado'
      );
    return restaurant.id;
  }

  private async assertCategoryOwnership(
    categoryId: string,
    commerceId: string
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if (category.commerceId !== commerceId)
      throw new ForbiddenException('Acceso denegado');
    return category;
  }

  private async assertProductOwnership(productId: string, commerceId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.commerceId !== commerceId)
      throw new ForbiddenException('Acceso denegado');
    return product;
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const commerceId = await this.getRestaurantId(userId);
    return this.prisma.category.findMany({
      where: { commerceId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const commerceId = await this.getRestaurantId(userId);
    const exists = await this.prisma.category.findUnique({
      where: { name_commerceId: { name: dto.name, commerceId } },
    });
    if (exists)
      throw new ConflictException('Ya existe una categoría con ese nombre');

    return this.prisma.category.create({
      data: { ...dto, commerceId },
    });
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto
  ) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);

    if (dto.name) {
      const exists = await this.prisma.category.findUnique({
        where: { name_commerceId: { name: dto.name, commerceId } },
      });
      if (exists && exists.id !== categoryId)
        throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async deleteCategory(userId: string, categoryId: string) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);

    const productCount = await this.prisma.product.count({
      where: { categoryId },
    });
    if (productCount > 0)
      throw new ConflictException(
        'No se puede eliminar una categoría con productos. Mueve o elimina los productos primero.'
      );

    await this.prisma.category.delete({ where: { id: categoryId } });
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(userId: string) {
    const commerceId = await this.getRestaurantId(userId);
    return this.prisma.product.findMany({
      where: { commerceId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getProductsByCategory(userId: string, categoryId: string) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);
    return this.prisma.product.findMany({
      where: { commerceId, categoryId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const commerceId = await this.getRestaurantId(userId);
    await this.planLimits.assertProductLimit(userId, commerceId);
    await this.assertCategoryOwnership(dto.categoryId, commerceId);

    const { categoryId, ...rest } = dto;
    return this.prisma.product.create({
      data: { ...rest, categoryId, commerceId },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto
  ) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertProductOwnership(productId, commerceId);

    if (dto.categoryId) {
      await this.assertCategoryOwnership(dto.categoryId, commerceId);
    }

    const { categoryId, ...rest } = dto;
    return this.prisma.product.update({
      where: { id: productId },
      data: { ...rest, ...(categoryId ? { categoryId } : {}) },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertProductOwnership(productId, commerceId);
    await this.prisma.product.delete({ where: { id: productId } });
  }

  async updateStock(userId: string, productId: string, dto: UpdateStockDto) {
    const commerceId = await this.getRestaurantId(userId);
    const product = await this.assertProductOwnership(productId, commerceId);

    let newStock: number;
    if (dto.type === StockUpdateType.ADD) {
      newStock = product.stock + dto.quantity;
    } else if (dto.type === StockUpdateType.SUBTRACT) {
      newStock = Math.max(0, product.stock - dto.quantity);
    } else {
      newStock = dto.quantity;
    }

    let newStatus: ProductStatus;
    if (newStock === 0) newStatus = ProductStatus.AGOTADO;
    else if (newStock <= product.minStock) newStatus = ProductStatus.BAJO_STOCK;
    else newStatus = ProductStatus.DISPONIBLE;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock, status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    if (
      newStatus === ProductStatus.BAJO_STOCK ||
      newStatus === ProductStatus.AGOTADO
    ) {
      this.notifications
        .notifyLowStock(commerceId, product.name, newStock)
        .catch(() => null);
    }

    return updated;
  }

  async toggleProductStatus(userId: string, productId: string) {
    const commerceId = await this.getRestaurantId(userId);
    const product = await this.assertProductOwnership(productId, commerceId);

    const newStatus =
      product.status === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE';
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }
}
