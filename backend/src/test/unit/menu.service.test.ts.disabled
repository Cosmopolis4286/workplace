import { Test, TestingModule } from '@nestjs/testing'
import { MenuService } from '../../menu/menu.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PlanLimitsService } from '../../plans/plan-limits.service'
import { CreateMenuItemDto } from '../../menu/dto/create-menu-item.dto'
import { UpdateMenuItemDto } from '../../menu/dto/update-menu-item.dto'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('MenuService', () => {
  let service: MenuService
  let prismaService: PrismaService
  let planLimitsService: PlanLimitsService

  const mockPrismaService = {
    menuItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  }

  const mockPlanLimitsService = {
    checkMenuItemLimit: jest.fn(),
    hasReachedMenuItemLimit: jest.fn(),
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
      ],
    }).compile()

    service = module.get<MenuService>(MenuService)
    prismaService = module.get<PrismaService>(PrismaService)
    planLimitsService = module.get<PlanLimitsService>(PlanLimitsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new menu item successfully', async () => {
      const commerceId = 'commerce-123'
      const createMenuItemDto: CreateMenuItemDto = {
        name: 'Hamburguesa Clásica',
        description: 'Deliciosa hamburguesa con carne, lechuga y tomate',
        price: 12.99,
        categoryId: 'category-123',
        imageUrl: 'https://example.com/image.jpg',
        isAvailable: true,
        preparationTime: 15,
        ingredients: ['carne', 'lechuga', 'tomate', 'pan'],
        allergens: ['gluten'],
      }

      const mockMenuItem = {
        id: 'menu-item-123',
        commerceId,
        name: 'Hamburguesa Clásica',
        description: 'Deliciosa hamburguesa con carne, lechuga y tomate',
        price: 12.99,
        categoryId: 'category-123',
        imageUrl: 'https://example.com/image.jpg',
        isAvailable: true,
        preparationTime: 15,
        ingredients: ['carne', 'lechuga', 'tomate', 'pan'],
        allergens: ['gluten'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPlanLimitsService.checkMenuItemLimit.mockResolvedValue(true)
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-123' })
      mockPrismaService.menuItem.create.mockResolvedValue(mockMenuItem)

      const result = await service.create(commerceId, createMenuItemDto)

      expect(result).toEqual(mockMenuItem)
      expect(mockPlanLimitsService.checkMenuItemLimit).toHaveBeenCalledWith(commerceId)
      expect(mockPrismaService.menuItem.create).toHaveBeenCalledWith({
        data: {
          commerceId,
          name: 'Hamburguesa Clásica',
          description: 'Deliciosa hamburguesa con carne, lechuga y tomate',
          price: 12.99,
          categoryId: 'category-123',
          imageUrl: 'https://example.com/image.jpg',
          isAvailable: true,
          preparationTime: 15,
          ingredients: ['carne', 'lechuga', 'tomate', 'pan'],
          allergens: ['gluten'],
        },
      })
    })

    it('should throw error if category not found', async () => {
      const commerceId = 'commerce-123'
      const createMenuItemDto: CreateMenuItemDto = {
        name: 'Test Item',
        price: 10.99,
        categoryId: 'invalid-category',
      }

      mockPlanLimitsService.checkMenuItemLimit.mockResolvedValue(true)
      mockPrismaService.category.findUnique.mockResolvedValue(null)

      await expect(service.create(commerceId, createMenuItemDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw error if menu item limit is reached', async () => {
      const commerceId = 'commerce-123'
      const createMenuItemDto: CreateMenuItemDto = {
        name: 'Test Item',
        price: 10.99,
        categoryId: 'category-123',
      }

      mockPlanLimitsService.checkMenuItemLimit.mockRejectedValue(
        new Error('Menu item limit reached')
      )

      await expect(service.create(commerceId, createMenuItemDto)).rejects.toThrow(
        'Menu item limit reached'
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated menu items', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: 1,
        limit: 10,
        categoryId: 'category-123',
        isAvailable: true,
      }

      const mockMenuItems = [
        {
          id: 'item-1',
          name: 'Hamburguesa',
          price: 12.99,
          isAvailable: true,
          category: { id: 'category-123', name: 'Platos Principales' },
        },
        {
          id: 'item-2',
          name: 'Papas Fritas',
          price: 4.99,
          isAvailable: true,
          category: { id: 'category-123', name: 'Platos Principales' },
        },
      ]

      mockPrismaService.menuItem.findMany.mockResolvedValue(mockMenuItems)
      mockPrismaService.menuItem.count.mockResolvedValue(2)

      const result = await service.findAll(commerceId, queryDto)

      expect(result).toEqual({
        items: mockMenuItems,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should apply search filter correctly', async () => {
      const commerceId = 'commerce-123'
      const queryDto = {
        page: 1,
        limit: 10,
        search: 'hamburguesa',
      }

      mockPrismaService.menuItem.findMany.mockResolvedValue([])
      mockPrismaService.menuItem.count.mockResolvedValue(0)

      await service.findAll(commerceId, queryDto)

      expect(mockPrismaService.menuItem.findMany).toHaveBeenCalledWith({
        where: {
          commerceId,
          name: {
            contains: 'hamburguesa',
            mode: 'insensitive',
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      })
    })
  })

  describe('findOne', () => {
    it('should return menu item by id', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'
      
      const mockMenuItem = {
        id: menuItemId,
        commerceId,
        name: 'Hamburguesa Clásica',
        price: 12.99,
        category: { id: 'category-123', name: 'Platos Principales' },
      }

      mockPrismaService.menuItem.findUnique.mockResolvedValue(mockMenuItem)

      const result = await service.findOne(menuItemId, commerceId)

      expect(result).toEqual(mockMenuItem)
      expect(mockPrismaService.menuItem.findUnique).toHaveBeenCalledWith({
        where: { id: menuItemId },
        include: { category: true },
      })
    })

    it('should throw error if menu item not found', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'

      mockPrismaService.menuItem.findUnique.mockResolvedValue(null)

      await expect(service.findOne(menuItemId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('should update menu item successfully', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'
      const updateMenuItemDto: UpdateMenuItemDto = {
        name: 'Hamburguesa Actualizada',
        price: 14.99,
        isAvailable: false,
      }

      const existingMenuItem = {
        id: menuItemId,
        commerceId,
        name: 'Hamburguesa Clásica',
        price: 12.99,
        isAvailable: true,
      }

      const updatedMenuItem = {
        ...existingMenuItem,
        name: 'Hamburguesa Actualizada',
        price: 14.99,
        isAvailable: false,
        updatedAt: new Date(),
      }

      mockPrismaService.menuItem.findUnique.mockResolvedValue(existingMenuItem)
      mockPrismaService.menuItem.update.mockResolvedValue(updatedMenuItem)

      const result = await service.update(menuItemId, commerceId, updateMenuItemDto)

      expect(result).toEqual(updatedMenuItem)
      expect(mockPrismaService.menuItem.update).toHaveBeenCalledWith({
        where: { id: menuItemId },
        data: {
          name: 'Hamburguesa Actualizada',
          price: 14.99,
          isAvailable: false,
        },
      })
    })

    it('should throw error if menu item not found', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'
      const updateMenuItemDto: UpdateMenuItemDto = {
        name: 'Updated Item',
      }

      mockPrismaService.menuItem.findUnique.mockResolvedValue(null)

      await expect(service.update(menuItemId, commerceId, updateMenuItemDto)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('should delete menu item successfully', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'
      
      const existingMenuItem = {
        id: menuItemId,
        commerceId,
        name: 'Hamburguesa Clásica',
      }

      mockPrismaService.menuItem.findUnique.mockResolvedValue(existingMenuItem)
      mockPrismaService.menuItem.delete.mockResolvedValue(existingMenuItem)

      const result = await service.remove(menuItemId, commerceId)

      expect(result).toEqual(existingMenuItem)
      expect(mockPrismaService.menuItem.delete).toHaveBeenCalledWith({
        where: { id: menuItemId },
      })
    })

    it('should throw error if menu item not found', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'

      mockPrismaService.menuItem.findUnique.mockResolvedValue(null)

      await expect(service.remove(menuItemId, commerceId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('updateAvailability', () => {
    it('should update menu item availability', async () => {
      const menuItemId = 'menu-item-123'
      const commerceId = 'commerce-123'
      const isAvailable = false

      const existingMenuItem = {
        id: menuItemId,
        commerceId,
        name: 'Hamburguesa Clásica',
        isAvailable: true,
      }

      const updatedMenuItem = {
        ...existingMenuItem,
        isAvailable: false,
        updatedAt: new Date(),
      }

      mockPrismaService.menuItem.findUnique.mockResolvedValue(existingMenuItem)
      mockPrismaService.menuItem.update.mockResolvedValue(updatedMenuItem)

      const result = await service.updateAvailability(menuItemId, commerceId, isAvailable)

      expect(result).toEqual(updatedMenuItem)
      expect(mockPrismaService.menuItem.update).toHaveBeenCalledWith({
        where: { id: menuItemId },
        data: { isAvailable: false },
      })
    })
  })

  describe('getCategories', () => {
    it('should return all categories for commerce', async () => {
      const commerceId = 'commerce-123'
      
      const mockCategories = [
        { id: 'cat-1', name: 'Platos Principales' },
        { id: 'cat-2', name: 'Bebidas' },
        { id: 'cat-3', name: 'Postres' },
      ]

      mockPrismaService.category.findMany.mockResolvedValue(mockCategories)

      const result = await service.getCategories(commerceId)

      expect(result).toEqual(mockCategories)
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { commerceId },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('getStats', () => {
    it('should return menu statistics', async () => {
      const commerceId = 'commerce-123'
      
      const mockStats = {
        total: 50,
        available: 40,
        unavailable: 10,
        byCategory: [
          { categoryId: 'cat-1', _count: 20 },
          { categoryId: 'cat-2', _count: 15 },
          { categoryId: 'cat-3', _count: 15 },
        ],
        avgPrice: { _avg: { price: 12.5 } },
      }

      mockPrismaService.menuItem.count
        .mockResolvedValueOnce(mockStats.total)
        .mockResolvedValueOnce(mockStats.available)
      mockPrismaService.menuItem.groupBy.mockResolvedValue(mockStats.byCategory)
      mockPrismaService.menuItem.aggregate.mockResolvedValue(mockStats.avgPrice)

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 50,
        available: 40,
        unavailable: 10,
        byCategory: {
          'cat-1': 20,
          'cat-2': 15,
          'cat-3': 15,
        },
        avgPrice: 12.5,
      })
    })

    it('should handle zero menu items gracefully', async () => {
      const commerceId = 'commerce-123'
      
      mockPrismaService.menuItem.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      mockPrismaService.menuItem.groupBy.mockResolvedValue([])
      mockPrismaService.menuItem.aggregate.mockResolvedValue({ _avg: { price: null } })

      const result = await service.getStats(commerceId)

      expect(result).toEqual({
        total: 0,
        available: 0,
        unavailable: 0,
        byCategory: {},
        avgPrice: 0,
      })
    })
  })
})
