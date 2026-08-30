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
      delete: jest.fn(),
      count: jest.fn(),
    },
  }

  const mockPlanLimitsService = {
    assertProductLimit: jest.fn(),
  }

  const mockCommerceResolverService = {
    resolve: jest.fn(async (userId: string) => {
      const commerce = await mockPrismaService.commerce.findUnique({ where: { userId } })
      return commerce?.id ?? userId
    }),
    resolveOrCreate: jest.fn(async (userId: string) => {
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
      it('should return products for user', async () => {
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

        const result = await service.getProducts(userId)

        expect(result).toEqual(mockProducts)
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
})
