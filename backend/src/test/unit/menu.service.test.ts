import { Test, TestingModule } from '@nestjs/testing'
import { MenuService } from '../../domains/commerce-core/menu/menu.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { CreateCategoryDto } from '../../domains/commerce-core/menu/dto/create-category.dto'
import { UpdateCategoryDto } from '../../domains/commerce-core/menu/dto/update-category.dto'
import { CreateProductDto } from '../../domains/commerce-core/menu/dto/create-product.dto'
import { UpdateProductDto } from '../../domains/commerce-core/menu/dto/update-product.dto'
import { CreateBundleDto } from '../../domains/commerce-core/menu/dto/create-bundle.dto'
import { UpdateStockDto, StockUpdateType } from '../../domains/commerce-core/menu/dto/update-stock.dto'
import { I18nService } from 'nestjs-i18n'

describe('MenuService', () => {
  let service: MenuService
  let prismaService: PrismaService
  let planLimitsService: typeof mockPlanLimitsService
  let notificationsService: NotificationsService

  const mockPrismaService = {
    commerce: {
      findUnique: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    // $transaction(array) en los services reales ejecuta cada promesa y
    // devuelve sus resultados — el mock replica eso con Promise.all en vez
    // de requerir que cada test stubee una transacción real.
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  }

  const mockPlanLimitsService = {
    assertProductLimit: jest.fn(),
  }

  const mockCommerceResolverService = {
    // MenuService ya no auto-crea (resolveOrCreate eliminado): los tests
    // simulan un usuario que ya tiene su Commerce 'commerce-123'.
    resolve: jest.fn(async (userId: string) => {
      const commerce = await mockPrismaService.commerce.findUnique({ where: { userId } })
      return commerce?.id ?? 'commerce-123'
    }),
  }

  const mockNotificationsService = {
    notifyLowStock: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CommerceResolverService,
          useValue: mockCommerceResolverService,
        },
        {
          provide: PLAN_LIMITS_FACADE,
          useValue: mockPlanLimitsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile()

    service = module.get<MenuService>(MenuService)
    prismaService = module.get<PrismaService>(PrismaService)
    planLimitsService = module.get(PLAN_LIMITS_FACADE)
    notificationsService = module.get<NotificationsService>(NotificationsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('Categories', () => {
    describe('getCategories', () => {
      it('should return categories for user', async () => {
        const userId = 'user-123'
        const mockCategories = [
          {
            id: 'cat-1',
            name: 'Bebidas',
            _count: { products: 5 },
          },
          {
            id: 'cat-2',
            name: 'Platos',
            _count: { products: 10 },
          },
        ]

        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findMany.mockResolvedValue(mockCategories)

        const result = await service.getCategories(userId)

        expect(result).toEqual(mockCategories)
      })
    })

    describe('createCategory', () => {
      it('should create a new category successfully', async () => {
        const userId = 'user-123'
        const createCategoryDto: CreateCategoryDto = {
          name: 'Nueva Categoría',
          color: '#FF0000',
        }

        const mockCategory = {
          id: 'cat-123',
          commerceId: 'commerce-123',
          name: 'Nueva Categoría',
          color: '#FF0000',
        }

        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue(null)
        mockPrismaService.category.create.mockResolvedValue(mockCategory)

        const result = await service.createCategory(userId, createCategoryDto)

        expect(result).toEqual(mockCategory)
      })
    })
  })

  describe('Products', () => {
    describe('getProducts', () => {
      it('should return paginated products for user', async () => {
        const userId = 'user-123'
        const mockProducts = [
          {
            id: 'prod-1',
            name: 'Hamburguesa',
            price: 12.99,
            category: { id: 'cat-1', name: 'Platos', color: '#FF0000' },
          },
        ]

        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue(mockProducts)
        mockPrismaService.product.count.mockResolvedValue(1)

        const result = await service.getProducts(userId)

        expect(result).toEqual({
          data: mockProducts,
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      })

      it('filters by search, categoryId and status server-side', async () => {
        const userId = 'user-123'
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([])
        mockPrismaService.product.count.mockResolvedValue(0)

        await service.getProducts(userId, { search: 'burger', categoryId: 'cat-1', status: 'LOW_STOCK' as any, page: '2', limit: '10' })

        expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              commerceId: 'commerce-123',
              categoryId: 'cat-1',
              status: 'LOW_STOCK',
              OR: [
                { name: { contains: 'burger', mode: 'insensitive' } },
                { brand: { contains: 'burger', mode: 'insensitive' } },
              ],
            }),
            skip: 10,
            take: 10,
          }),
        )
      })
    })

    describe('getProductsStats', () => {
      it('returns aggregated counters without loading all products into memory', async () => {
        const userId = 'user-123'
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.product.count
          .mockResolvedValueOnce(50) // total
          .mockResolvedValueOnce(5)  // lowStock
          .mockResolvedValueOnce(2)  // outOfStock
        mockPrismaService.$queryRaw.mockResolvedValue([{ totalvalue: 1234.5, totalcost: 800.25 }])

        const result = await service.getProductsStats(userId)

        expect(result).toEqual({
          total: 50,
          lowStock: 5,
          outOfStock: 2,
          totalValue: 1234.5,
          totalCost: 800.25,
        })
        expect(mockPrismaService.product.findMany).not.toHaveBeenCalled()
      })
    })

    describe('getProductsForSelector', () => {
      it('returns a minimal, unpaginated list for the sale product picker', async () => {
        const userId = 'user-123'
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([
          { id: 'prod-1', name: 'Hamburguesa', price: 12.99, stock: 5, image: null, unit: 'unidad', status: 'AVAILABLE' },
        ])

        const result = await service.getProductsForSelector(userId, 'burg')

        expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              commerceId: 'commerce-123',
              status: { not: 'UNAVAILABLE' },
              name: { contains: 'burg', mode: 'insensitive' },
            }),
            take: 500,
          }),
        )
        expect(result).toHaveLength(1)
      })
    })

    describe('createProduct', () => {
      it('should create a new product successfully', async () => {
        const userId = 'user-123'
        const createProductDto: CreateProductDto = {
          name: 'Nuevo Producto',
          description: 'Descripción del producto',
          price: 15.99,
          categoryId: 'cat-123',
          stock: 100,
          minStock: 10,
          cost: 8.50,
        }

        const mockProduct = {
          id: 'prod-123',
          commerceId: 'commerce-123',
          name: 'Nuevo Producto',
          description: 'Descripción del producto',
          price: 15.99,
          categoryId: 'cat-123',
          stock: 100,
          minStock: 10,
          cost: 8.50,
          category: { id: 'cat-123', name: 'Categoría', color: '#FF0000' },
        }

        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPlanLimitsService.assertProductLimit.mockResolvedValue(undefined)
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })
        mockPrismaService.product.create.mockResolvedValue(mockProduct)

        const result = await service.createProduct(userId, createProductDto)

        expect(result).toEqual(mockProduct)
      })
    })

    describe('updateStock', () => {
      it('should update product stock successfully', async () => {
        const userId = 'user-123'
        const productId = 'prod-123'
        const updateStockDto: UpdateStockDto = {
          type: StockUpdateType.ADD,
          quantity: 50,
        }

        const existingProduct = {
          id: productId,
          commerceId: 'commerce-123',
          name: 'Producto Test',
          stock: 100,
          minStock: 10,
        }

        const updatedProduct = {
          ...existingProduct,
          stock: 150,
          category: { id: 'cat-123', name: 'Categoría', color: '#FF0000' },
        }

        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.product.findUnique.mockResolvedValue(existingProduct)
        mockPrismaService.product.update.mockResolvedValue(updatedProduct)

        const result = await service.updateStock(userId, productId, updateStockDto)

        expect(result).toEqual(updatedProduct)
      })
    })

    describe('createBundle', () => {
      const userId = 'user-123'
      const bundleDto: CreateBundleDto = {
        name: 'Combo Familiar',
        price: 40,
        categoryId: 'cat-123',
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 },
        ],
      }

      it('creates a bundle when all components belong to the same commerce', async () => {
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([
          { id: 'prod-1', commerceId: 'commerce-123', isBundle: false },
          { id: 'prod-2', commerceId: 'commerce-123', isBundle: false },
        ])
        const created = { id: 'bundle-1', isBundle: true, ...bundleDto }
        mockPrismaService.product.create.mockResolvedValue(created)

        const result = await service.createBundle(userId, bundleDto)

        expect(result).toEqual(created)
        expect(mockPrismaService.product.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              isBundle: true,
              bundleItems: { create: [
                { componentProductId: 'prod-1', quantity: 2 },
                { componentProductId: 'prod-2', quantity: 1 },
              ] },
            }),
          })
        )
      })

      it('rejects a component that belongs to another commerce', async () => {
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([
          { id: 'prod-1', commerceId: 'commerce-123', isBundle: false },
          { id: 'prod-2', commerceId: 'otro-comercio', isBundle: false },
        ])

        await expect(service.createBundle(userId, bundleDto)).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.create).not.toHaveBeenCalled()
      })

      it('rejects a component that is itself a bundle (no nested bundles)', async () => {
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([
          { id: 'prod-1', commerceId: 'commerce-123', isBundle: false },
          { id: 'prod-2', commerceId: 'commerce-123', isBundle: true },
        ])

        await expect(service.createBundle(userId, bundleDto)).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.create).not.toHaveBeenCalled()
      })

      it('rejects duplicate product ids in the items list', async () => {
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })

        const dupDto = { ...bundleDto, items: [{ productId: 'prod-1', quantity: 1 }, { productId: 'prod-1', quantity: 2 }] }

        await expect(service.createBundle(userId, dupDto)).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.findMany).not.toHaveBeenCalled()
      })

      it('rejects if a component product does not exist', async () => {
        mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'commerce-123' })
        mockPrismaService.product.findMany.mockResolvedValue([
          { id: 'prod-1', commerceId: 'commerce-123', isBundle: false },
        ])

        await expect(service.createBundle(userId, bundleDto)).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.create).not.toHaveBeenCalled()
      })
    })
  })

  describe('Bulk actions', () => {
    const userId = 'user-123'
    const productIds = ['prod-1', 'prod-2', 'prod-3']

    beforeEach(() => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({ id: 'commerce-123' })
    })

    describe('bulkToggleStatus', () => {
      it('sets AVAILABLE for all matching products when activating', async () => {
        mockPrismaService.product.updateMany.mockResolvedValue({ count: 3 })

        const result = await service.bulkToggleStatus(userId, productIds, true)

        expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
          where: { id: { in: productIds }, commerceId: 'commerce-123' },
          data: { status: 'AVAILABLE' },
        })
        expect(result).toEqual({ updated: 3 })
      })

      it('sets UNAVAILABLE for all matching products when deactivating', async () => {
        mockPrismaService.product.updateMany.mockResolvedValue({ count: 2 })

        const result = await service.bulkToggleStatus(userId, productIds, false)

        expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
          where: { id: { in: productIds }, commerceId: 'commerce-123' },
          data: { status: 'UNAVAILABLE' },
        })
        expect(result).toEqual({ updated: 2 })
      })

      it('scopes the update to commerceId — ids from another commerce are silently ignored by the where clause', async () => {
        // No se valida ownership uno por uno a propósito (ver comentario en
        // el service): updateMany con commerceId en el where ya garantiza
        // que un id ajeno nunca matchea ninguna fila. count refleja cuántos
        // de los ids enviados realmente pertenecían al comercio.
        mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 })

        const result = await service.bulkToggleStatus(userId, ['prod-1', 'prod-ajeno'], true)

        expect(result).toEqual({ updated: 1 })
      })
    })

    describe('bulkDelete', () => {
      it('deletes all matching products scoped to the commerce', async () => {
        mockPrismaService.product.deleteMany.mockResolvedValue({ count: 3 })

        const result = await service.bulkDelete(userId, productIds)

        expect(mockPrismaService.product.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: productIds }, commerceId: 'commerce-123' },
        })
        expect(result).toEqual({ deleted: 3 })
      })
    })

    describe('bulkMoveCategory', () => {
      it('moves all matching products to the target category after verifying its ownership', async () => {
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-456', commerceId: 'commerce-123' })
        mockPrismaService.product.updateMany.mockResolvedValue({ count: 3 })

        const result = await service.bulkMoveCategory(userId, productIds, 'cat-456')

        expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-456' } })
        expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
          where: { id: { in: productIds }, commerceId: 'commerce-123' },
          data: { categoryId: 'cat-456' },
        })
        expect(result).toEqual({ updated: 3 })
      })

      it('rejects moving products into a category owned by another commerce', async () => {
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-456', commerceId: 'other-commerce' })

        await expect(service.bulkMoveCategory(userId, productIds, 'cat-456')).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.updateMany).not.toHaveBeenCalled()
      })

      it('rejects moving products into a category that does not exist', async () => {
        mockPrismaService.category.findUnique.mockResolvedValue(null)

        await expect(service.bulkMoveCategory(userId, productIds, 'missing-cat')).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.updateMany).not.toHaveBeenCalled()
      })
    })

    describe('reorderCategories', () => {
      it('assigns sortOrder = array index to each category, in the given order', async () => {
        mockPrismaService.category.findMany
          .mockResolvedValueOnce([{ id: 'cat-2' }, { id: 'cat-1' }, { id: 'cat-3' }]) // ownership check
          .mockResolvedValueOnce([]) // getCategories() al final
        mockPrismaService.category.update.mockResolvedValue({})

        await service.reorderCategories(userId, ['cat-2', 'cat-1', 'cat-3'])

        expect(mockPrismaService.category.update).toHaveBeenNthCalledWith(1, { where: { id: 'cat-2' }, data: { sortOrder: 0 } })
        expect(mockPrismaService.category.update).toHaveBeenNthCalledWith(2, { where: { id: 'cat-1' }, data: { sortOrder: 1 } })
        expect(mockPrismaService.category.update).toHaveBeenNthCalledWith(3, { where: { id: 'cat-3' }, data: { sortOrder: 2 } })
      })

      it('rejects if any category id does not belong to the commerce', async () => {
        mockPrismaService.category.findMany.mockResolvedValueOnce([{ id: 'cat-1' }]) // solo 1 de 2 pertenece

        await expect(service.reorderCategories(userId, ['cat-1', 'cat-ajena'])).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.category.update).not.toHaveBeenCalled()
      })
    })

    describe('reorderProducts', () => {
      it('assigns sortOrder = array index when all products share the same category', async () => {
        mockPrismaService.product.findMany
          .mockResolvedValueOnce([
            { id: 'prod-2', categoryId: 'cat-1' },
            { id: 'prod-1', categoryId: 'cat-1' },
            { id: 'prod-3', categoryId: 'cat-1' },
          ]) // ownership + same-category check
          .mockResolvedValueOnce([]) // findMany final de retorno
        mockPrismaService.product.update.mockResolvedValue({})

        await service.reorderProducts(userId, ['prod-2', 'prod-1', 'prod-3'])

        expect(mockPrismaService.product.update).toHaveBeenNthCalledWith(1, { where: { id: 'prod-2' }, data: { sortOrder: 0 } })
        expect(mockPrismaService.product.update).toHaveBeenNthCalledWith(2, { where: { id: 'prod-1' }, data: { sortOrder: 1 } })
        expect(mockPrismaService.product.update).toHaveBeenNthCalledWith(3, { where: { id: 'prod-3' }, data: { sortOrder: 2 } })
      })

      it('rejects if any product id does not belong to the commerce', async () => {
        mockPrismaService.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', categoryId: 'cat-1' }])

        await expect(service.reorderProducts(userId, ['prod-1', 'prod-ajeno'])).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.update).not.toHaveBeenCalled()
      })

      it('rejects reordering products that span more than one category', async () => {
        // El drag-and-drop en menu.vue reordena DENTRO de una sección —
        // mezclar categorías indicaría un bug de frontend o un payload manipulado.
        mockPrismaService.product.findMany.mockResolvedValueOnce([
          { id: 'prod-1', categoryId: 'cat-1' },
          { id: 'prod-2', categoryId: 'cat-2' },
        ])

        await expect(service.reorderProducts(userId, ['prod-1', 'prod-2'])).rejects.toBeInstanceOf(Error)
        expect(mockPrismaService.product.update).not.toHaveBeenCalled()
      })
    })
  })
})
