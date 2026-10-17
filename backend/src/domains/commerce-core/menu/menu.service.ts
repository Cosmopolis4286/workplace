import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../money/plans/plan-limits.facade';
import { normalizeTags } from '../../../common/utils/tags.util';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly notifications: NotificationsService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimits: PlanLimitsFacade,
    private readonly i18n: I18nService
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Ya no auto-crea el Commerce (antes resolveOrCreate): abrir el menú le
  // creaba uno a cualquiera, incluido SUPERADMIN (que bypassea permisos). El
  // Commerce se crea al aprobar el perfil — ver shouldProvisionCommerce. El
  // acceso lo cortan antes ModuleAccessGuard (menu ∈ COMMERCE_BOUND_MODULES
  // → HAS_COMMERCE) y la matriz de permisos.
  private async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  private async assertCategoryOwnership(
    categoryId: string,
    commerceId: string
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category)
      throw new NotFoundException(this.i18n.t('menu.category.not_found'));
    if (category.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return category;
  }

  private async assertProductOwnership(productId: string, commerceId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(this.i18n.t('menu.product.not_found'));
    if (product.commerceId !== commerceId)
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    return product;
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.category.findMany({
      where: { commerceId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const commerceId = await this.getCommerceId(userId);
    const exists = await this.prisma.category.findUnique({
      where: { name_commerceId: { name: dto.name, commerceId } },
    });
    if (exists)
      throw new ConflictException(this.i18n.t('menu.category.name_taken'));

    // Nueva categoría al final del orden manual — mismo criterio que
    // SearchTabsService.create (count como siguiente sortOrder).
    const count = await this.prisma.category.count({ where: { commerceId } });
    return this.prisma.category.create({
      data: { ...dto, commerceId, sortOrder: count },
    });
  }

  // Drag-and-drop en /menu: el índice de cada id en el array recibido se
  // convierte en su sortOrder — mismo patrón que SearchTabsService.reorder.
  async reorderCategories(userId: string, categoryIds: string[]) {
    const commerceId = await this.getCommerceId(userId);
    const owned = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, commerceId },
      select: { id: true },
    });
    if (owned.length !== categoryIds.length) {
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    }

    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return this.getCategories(userId);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto
  ) {
    const commerceId = await this.getCommerceId(userId);
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
    const commerceId = await this.getCommerceId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);

    const productCount = await this.prisma.product.count({
      where: { categoryId },
    });
    if (productCount > 0)
      throw new ConflictException(this.i18n.t('menu.category.has_products'));

    await this.prisma.category.delete({ where: { id: categoryId } });
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(userId: string, query: QueryProductsDto = {}) {
    const commerceId = await this.getCommerceId(userId);
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { commerceId };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Todos los productos del comercio sin paginar, para el selector de venta
  // (crear una Order necesita poder buscar en TODO el catálogo, no solo la
  // página visible de /inventory) — select mínimo para no traer campos que
  // ese flujo no usa.
  async getProductsForSelector(userId: string, search?: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.product.findMany({
      where: {
        commerceId,
        status: { not: 'UNAVAILABLE' },
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        image: true,
        unit: true,
        status: true,
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  // Todos los productos del comercio sin paginar, con todos los campos que
  // necesita el CSV de exportación de Inventario — separado de getProducts
  // (que sí pagina) porque exportar SIEMPRE debe incluir el catálogo
  // completo, no solo la página que el usuario tiene visible.
  async getProductsForExport(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    return this.prisma.product.findMany({
      where: { commerceId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // Contadores agregados en SQL — antes se calculaban en el frontend
  // iterando el array completo de productos, lo que obligaba a traer todo
  // el catálogo a memoria solo para mostrar 4 números en el header.
  async getProductsStats(userId: string) {
    const commerceId = await this.getCommerceId(userId);
    const [total, lowStock, outOfStock, valueAgg] = await Promise.all([
      this.prisma.product.count({ where: { commerceId } }),
      this.prisma.product.count({
        where: { commerceId, stock: { gt: 0 }, status: 'LOW_STOCK' },
      }),
      this.prisma.product.count({ where: { commerceId, stock: 0 } }),
      this.prisma.$queryRaw<
        { totalvalue: number | null; totalcost: number | null }[]
      >`
        SELECT SUM(price * stock)::float AS totalvalue, SUM(cost * stock)::float AS totalcost
        FROM products WHERE "commerceId" = ${commerceId}
      `,
    ]);

    return {
      total,
      lowStock,
      outOfStock,
      totalValue: valueAgg[0]?.totalvalue ?? 0,
      totalCost: valueAgg[0]?.totalcost ?? 0,
    };
  }

  async getProductsByCategory(userId: string, categoryId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);
    return this.prisma.product.findMany({
      where: { commerceId, categoryId },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.planLimits.assertProductLimit(userId, commerceId);
    await this.assertCategoryOwnership(dto.categoryId, commerceId);

    // Nuevo producto al final del orden manual de SU categoría (no del
    // comercio completo) — el reorder por drag-and-drop es por categoría.
    const sortOrder = await this.prisma.product.count({
      where: { categoryId: dto.categoryId },
    });

    const { categoryId, ...rest } = dto;
    return this.prisma.product.create({
      data: {
        ...rest,
        tags: normalizeTags(dto.tags) ?? [],
        categoryId,
        commerceId,
        sortOrder,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  // Drag-and-drop dentro de una categoría en /menu: el índice de cada id en
  // el array recibido se convierte en su sortOrder. A diferencia de
  // reorderCategories, no recibe categoryId explícito — se infiere y valida
  // a partir de los productos mismos (deben ser todos de la misma categoría,
  // y esa categoría debe ser del comercio del usuario).
  async reorderProducts(userId: string, productIds: string[]) {
    const commerceId = await this.getCommerceId(userId);
    const owned = await this.prisma.product.findMany({
      where: { id: { in: productIds }, commerceId },
      select: { id: true, categoryId: true },
    });
    if (owned.length !== productIds.length) {
      throw new ForbiddenException(this.i18n.t('common.errors.access_denied'));
    }
    const distinctCategories = new Set(owned.map((p) => p.categoryId));
    if (distinctCategories.size > 1) {
      throw new ConflictException(
        'Todos los productos deben pertenecer a la misma categoría para reordenarlos'
      );
    }

    await this.prisma.$transaction(
      productIds.map((id, index) =>
        this.prisma.product.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertProductOwnership(productId, commerceId);

    if (dto.categoryId) {
      await this.assertCategoryOwnership(dto.categoryId, commerceId);
    }

    const { categoryId, ...rest } = dto;
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...rest,
        tags: normalizeTags(dto.tags),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertProductOwnership(productId, commerceId);
    await this.prisma.product.delete({ where: { id: productId } });
  }

  // ─── Bulk actions ───────────────────────────────────────────────────────────
  // Todas filtran por `commerceId` directo en el `where` en vez de validar
  // ownership uno por uno (como el resto del service) — con updateMany/
  // deleteMany, cualquier id que no sea del comercio simplemente no matchea
  // ninguna fila, sin necesidad de un loop de asserts. `count` en la
  // respuesta permite al frontend avisar si algún id fue ignorado (ej. ya
  // borrado por otra pestaña).

  async bulkToggleStatus(
    userId: string,
    productIds: string[],
    makeAvailable: boolean
  ) {
    const commerceId = await this.getCommerceId(userId);
    const result = await this.prisma.product.updateMany({
      where: { id: { in: productIds }, commerceId },
      data: {
        status: makeAvailable
          ? ProductStatus.AVAILABLE
          : ProductStatus.UNAVAILABLE,
      },
    });
    return { updated: result.count };
  }

  async bulkDelete(userId: string, productIds: string[]) {
    const commerceId = await this.getCommerceId(userId);
    const result = await this.prisma.product.deleteMany({
      where: { id: { in: productIds }, commerceId },
    });
    return { deleted: result.count };
  }

  async bulkMoveCategory(
    userId: string,
    productIds: string[],
    categoryId: string
  ) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertCategoryOwnership(categoryId, commerceId);
    const result = await this.prisma.product.updateMany({
      where: { id: { in: productIds }, commerceId },
      data: { categoryId },
    });
    return { updated: result.count };
  }

  // ─── Bundles (packs) ────────────────────────────────────────────────────────

  async createBundle(userId: string, dto: CreateBundleDto) {
    const commerceId = await this.getCommerceId(userId);
    await this.planLimits.assertProductLimit(userId, commerceId);
    await this.assertCategoryOwnership(dto.categoryId, commerceId);

    const componentIds = dto.items.map((i) => i.productId);
    if (new Set(componentIds).size !== componentIds.length) {
      throw new ConflictException(
        'No puedes repetir el mismo producto como componente del pack'
      );
    }

    const components = await this.prisma.product.findMany({
      where: { id: { in: componentIds } },
      select: { id: true, commerceId: true, isBundle: true },
    });
    if (components.length !== componentIds.length) {
      throw new NotFoundException(
        'Alguno de los productos seleccionados no existe'
      );
    }
    for (const c of components) {
      if (c.commerceId !== commerceId) {
        throw new ForbiddenException(
          'Todos los componentes deben ser productos de tu propio comercio'
        );
      }
      // Sin bundles anidados: mantiene el descuento de stock en un solo
      // nivel (ver CatalogService.createOrder, que resuelve isBundle una vez).
      if (c.isBundle) {
        throw new ConflictException(
          'Un pack no puede tener otro pack como componente'
        );
      }
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        image: dto.image,
        categoryId: dto.categoryId,
        commerceId,
        isBundle: true,
        forSale: true,
        bundleItems: {
          create: dto.items.map((i) => ({
            componentProductId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        bundleItems: {
          include: {
            componentProduct: {
              select: { id: true, name: true, price: true, image: true },
            },
          },
        },
      },
    });
  }

  async updateProductImage(userId: string, productId: string, image: string) {
    const commerceId = await this.getCommerceId(userId);
    await this.assertProductOwnership(productId, commerceId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { image },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateStock(userId: string, productId: string, dto: UpdateStockDto) {
    const commerceId = await this.getCommerceId(userId);
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
    if (newStock === 0) newStatus = ProductStatus.OUT_OF_STOCK;
    else if (newStock <= product.minStock) newStatus = ProductStatus.LOW_STOCK;
    else newStatus = ProductStatus.AVAILABLE;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock, status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    if (
      newStatus === ProductStatus.LOW_STOCK ||
      newStatus === ProductStatus.OUT_OF_STOCK
    ) {
      this.notifications
        .notifyLowStock(commerceId, product.name, newStock)
        .catch(() => null);
    }

    return updated;
  }

  async toggleProductStatus(userId: string, productId: string) {
    const commerceId = await this.getCommerceId(userId);
    const product = await this.assertProductOwnership(productId, commerceId);

    const newStatus =
      product.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: newStatus },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }
}
