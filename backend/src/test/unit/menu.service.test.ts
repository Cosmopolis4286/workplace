import { Test, TestingModule } from '@nestjs/testing'
import { MenuService } from '../../domains/commerce-core/menu/menu.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../domains/money/plans/plan-limits.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { CategoryHelper } from '../../common/helpers/category.helper'
import { CreateCategoryDto } from '../../domains/commerce-core/menu/dto/create-category.dto'
import { UpdateCategoryDto } from '../../domains/commerce-core/menu/dto/update-category.dto'
import { CreateProductDto } from '../../domains/commerce-core/menu/dto/create-product.dto'
import { UpdateProductDto } from '../../domains/commerce-core/menu/dto/update-product.dto'
import { UpdateStockDto, StockUpdateType } from '../../domains/commerce-core/menu/dto/update-stock.dto'
import { I18nService } from 'nestjs-i18n'

describe('MenuService', () => {
  let service: MenuService
  let prismaService: PrismaService
  let planLimitsService: PlanLimitsService
  let notificationsService: NotificationsService

  const mockPrismaService = {
    restaurant: {
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

  const mockNotificationsService = {
    notifyLowStock: jest.fn(),
  }

  const mockCategoryHelper = {
    isUserInFoodCategory: jest.fn().mockResolvedValue(true),
    userNeedsRestaurant: jest.fn().mockResolvedValue(true),
    getRestaurantIdForUser: jest.fn().mockResolvedValue('restaurant-123'),
    validateRestaurantForFoodCategory: jest.fn().mockResolvedValue('restaurant-123'),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PlanLimitsService,
          useValue: mockPlanLimitsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: CategoryHelper,
          useValue: mockCategoryHelper,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile()

    service = module.get<MenuService>(MenuService)
    prismaService = module.get<PrismaService>(PrismaService)
    planLimitsService = module.get<PlanLimitsService>(PlanLimitsService)
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

        mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
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

        mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
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

        mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'commerce-123' })
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

        mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'restaurant-123' })
        mockPlanLimitsService.assertProductLimit.mockResolvedValue(undefined)
        mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-123', commerceId: 'restaurant-123' })
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
          commerceId: 'restaurant-123',
          name: 'Producto Test',
          stock: 100,
          minStock: 10,
        }

        const updatedProduct = {
          ...existingProduct,
          stock: 150,
          category: { id: 'cat-123', name: 'Categoría', color: '#FF0000' },
        }

        mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'restaurant-123' })
        mockPrismaService.product.findUnique.mockResolvedValue(existingProduct)
        mockPrismaService.product.update.mockResolvedValue(updatedProduct)

        const result = await service.updateStock(userId, productId, updateStockDto)

        expect(result).toEqual(updatedProduct)
      })
    })
  })
})
