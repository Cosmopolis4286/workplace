import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { normalizeTags } from '../common/utils/tags.util';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly planLimits: PlanLimitsService,
    private readonly i18n: I18nService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Un freelancer no tiene (ni debe tener) un Restaurant: vende vía
  // Service/ServiceRequest, no Product/Order. La defensa en profundidad
  // vive en AccountTypeGuard (@RequireAccountType('COMMERCE') en
  // MenuController) — este método ya no necesita conocer Role.
  private async getRestaurantId(userId: string): Promise<string> {
    const commerce = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (commerce) return commerce.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const created = await this.prisma.restaurant.create({
      data: { userId, name: `${user?.firstName ?? 'Mi'} ${user?.lastName ?? 'Negocio'}`.trim() },
      select: { id: true },
    });
    return created.id;
  }

  private async assertCategoryOwnership(
    categoryId: string,
    commerceId: string
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException(this.i18n.t('menu.category.not_found'));
    if (category.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return category;
  }

  private async assertProductOwnership(productId: string, commerceId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException(this.i18n.t('menu.product.not_found'));
    if (product.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
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
      throw new ConflictException(this.i18n.t('menu.category.name_taken'));

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
        throw new ConflictException(this.i18n.t('menu.category.name_taken'));
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
      throw new ConflictException(this.i18n.t('menu.category.has_products'));

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
      data: { ...rest, tags: normalizeTags(dto.tags) ?? [], categoryId, commerceId },
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
      data: { ...rest, tags: normalizeTags(dto.tags), ...(categoryId ? { categoryId } : {}) },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertProductOwnership(productId, commerceId);
    await this.prisma.product.delete({ where: { id: productId } });
  }

  async updateProductImage(userId: string, productId: string, image: string) {
    const commerceId = await this.getRestaurantId(userId);
    await this.assertProductOwnership(productId, commerceId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { image },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
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
