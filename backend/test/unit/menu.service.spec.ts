import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from '../../src/domains/commerce-core/menu/menu.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/domains/engagement/notifications/notifications.service';
import { PlanLimitsService } from '../../src/domains/money/plans/plan-limits.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

describe('MenuService', () => {
  let service: MenuService;
  let mockPrismaService: Partial<PrismaService>;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockPlanLimitsService: Partial<PlanLimitsService>;

  beforeEach(async () => {
    mockPrismaService = {
      restaurant: {
        findUnique: jest.fn(),
      } as any,
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any,
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      } as any,
    };

    mockNotificationsService = {
      notifyLowStock: jest.fn().mockResolvedValue(undefined),
    };

    mockPlanLimitsService = {
      assertProductLimit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PlanLimitsService, useValue: mockPlanLimitsService },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('getCategories', () => {
    it('should return categories for a commerce', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Bebidas', _count: { products: 5 } },
        { id: 'cat-2', name: 'Comidas', _count: { products: 10 } },
      ];

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findMany = jest.fn().mockResolvedValue(mockCategories);

      const result = await service.getCategories('user-id');

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { commerceId: 'commerce-id' },
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
    });

    it('should throw ForbiddenException when user has no restaurant', async () => {
      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getCategories('user-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const mockCategory = { id: 'cat-id', name: 'Nueva Categoría', commerceId: 'commerce-id' };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findUnique = jest.fn().mockResolvedValue(null);
      mockPrismaService.category.create = jest.fn().mockResolvedValue(mockCategory);

      const result = await service.createCategory('user-id', { name: 'Nueva Categoría', color: '#FF0000' });

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when category name exists', async () => {
      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findUnique = jest.fn().mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createCategory('user-id', { name: 'Bebidas', color: '#FF0000' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category when empty', async () => {
      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findUnique = jest.fn().mockResolvedValue({ id: 'cat-id', commerceId: 'commerce-id' });
      mockPrismaService.product.count = jest.fn().mockResolvedValue(0);
      mockPrismaService.category.delete = jest.fn().mockResolvedValue({ id: 'cat-id' });

      await service.deleteCategory('user-id', 'cat-id');

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-id' } });
    });

    it('should throw ConflictException when category has products', async () => {
      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findUnique = jest.fn().mockResolvedValue({ id: 'cat-id', commerceId: 'commerce-id' });
      mockPrismaService.product.count = jest.fn().mockResolvedValue(5);

      await expect(service.deleteCategory('user-id', 'cat-id')).rejects.toThrow(ConflictException);
    });
  });

  describe('getProducts', () => {
    it('should return products for a commerce', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Producto 1', category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' } },
      ];

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.product.findMany = jest.fn().mockResolvedValue(mockProducts);

      const result = await service.getProducts('user-id');

      expect(result).toEqual(mockProducts);
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const mockProduct = {
        id: 'prod-id',
        name: 'Nuevo Producto',
        price: 100,
        category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' },
      };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.category.findUnique = jest.fn().mockResolvedValue({ id: 'cat-id', commerceId: 'commerce-id' });
      mockPrismaService.product.create = jest.fn().mockResolvedValue(mockProduct);

      const result = await service.createProduct('user-id', {
        name: 'Nuevo Producto',
        price: 100,
        categoryId: 'cat-id',
      } as any);

      expect(result).toEqual(mockProduct);
      expect(mockPlanLimitsService.assertProductLimit).toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should add stock correctly', async () => {
      const mockProduct = {
        id: 'prod-id',
        name: 'Producto',
        stock: 10,
        minStock: 5,
        status: ProductStatus.AVAILABLE,
        category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' },
      };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);
      mockPrismaService.product.update = jest.fn().mockResolvedValue({
        ...mockProduct,
        stock: 15,
        status: ProductStatus.AVAILABLE,
      });

      const result = await service.updateStock('user-id', 'prod-id', {
        type: 'ADD' as any,
        quantity: 5,
      });

      expect(result.stock).toBe(15);
      expect(mockNotificationsService.notifyLowStock).not.toHaveBeenCalled();
    });

    it('should notify low stock when below minimum', async () => {
      const mockProduct = {
        id: 'prod-id',
        name: 'Producto',
        stock: 10,
        minStock: 5,
        status: ProductStatus.AVAILABLE,
        category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' },
      };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);
      mockPrismaService.product.update = jest.fn().mockResolvedValue({
        ...mockProduct,
        stock: 3,
        status: ProductStatus.LOW_STOCK,
      });

      await service.updateStock('user-id', 'prod-id', {
        type: 'SET' as any,
        quantity: 3,
      });

      expect(mockNotificationsService.notifyLowStock).toHaveBeenCalled();
    });

    it('should not allow negative stock when subtracting', async () => {
      const mockProduct = {
        id: 'prod-id',
        name: 'Producto',
        stock: 5,
        minStock: 5,
        status: ProductStatus.AVAILABLE,
        category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' },
      };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);
      mockPrismaService.product.update = jest.fn().mockResolvedValue({
        ...mockProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });

      const result = await service.updateStock('user-id', 'prod-id', {
        type: 'SUBTRACT' as any,
        quantity: 10,
      });

      expect(result.stock).toBe(0);
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle from AVAILABLE to UNAVAILABLE', async () => {
      const mockProduct = {
        id: 'prod-id',
        name: 'Producto',
        status: ProductStatus.AVAILABLE,
        category: { id: 'cat-1', name: 'Bebidas', color: '#FF0000' },
      };

      mockPrismaService.restaurant.findUnique = jest.fn().mockResolvedValue({ id: 'commerce-id' });
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(mockProduct);
      mockPrismaService.product.update = jest.fn().mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.UNAVAILABLE,
      });

      const result = await service.toggleProductStatus('user-id', 'prod-id');

      expect(result.status).toBe(ProductStatus.UNAVAILABLE);
    });
  });
});
