import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ProductStatus } from '@prisma/client'
import { CatalogService } from '../../domains/commerce-core/catalog/catalog.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'

describe('CatalogService', () => {
  let service: CatalogService
  let mockPrismaService: any
  let mockNotificationsService: Partial<NotificationsService>

  const REQUESTER_ID = 'requester-1'
  const PRODUCT_ID = 'product-1'
  const COMMERCE_ID = 'commerce-1'

  function baseProduct(overrides: Partial<any> = {}) {
    return {
      name: 'Torta de chocolate',
      price: 25,
      status: ProductStatus.AVAILABLE,
      forSale: true,
      commerceId: COMMERCE_ID,
      commerce: { name: 'Pastelería Ana' },
      ...overrides,
    }
  }

  function baseDto(overrides: Partial<any> = {}) {
    return {
      productId: PRODUCT_ID,
      productName: 'nombre falso inyectado',
      commerceId: COMMERCE_ID,
      commerceName: 'comercio falso inyectado',
      quantity: 2,
      deliveryType: 'HOME_DELIVERY',
      buyerName: 'Cliente Uno',
      buyerPhone: '+58111',
      totalEstimate: 0.01,
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      product: { findUnique: jest.fn(), updateMany: jest.fn() },
      catalogOrder: { create: jest.fn() },
    }
    mockNotificationsService = {
      notifyNewCatalogOrder: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile()

    service = module.get<CatalogService>(CatalogService)
  })

  describe('createOrder', () => {
    it('lanza NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled()
    })

    it('lanza NotFoundException si el producto no está disponible (forSale=false)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(baseProduct({ forSale: false }))

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('lanza NotFoundException si el producto no está AVAILABLE', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(baseProduct({ status: ProductStatus.OUT_OF_STOCK }))

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rechaza si el commerceId del body no coincide con el dueño real del producto', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(baseProduct({ commerceId: 'otro-comercio' }))

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled()
    })

    it('ignora productName/commerceName/totalEstimate del body y los deriva del producto real', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(baseProduct())
      mockPrismaService.catalogOrder.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'order-1', ...data }))

      const result = await service.createOrder(baseDto() as any, REQUESTER_ID)

      expect(result.data.productName).toBe('Torta de chocolate')
      expect(result.data.commerceName).toBe('Pastelería Ana')
      expect(result.data.totalEstimate).toBe(50) // price 25 * quantity 2, no el 0.01 del body
    })

    it('incrementa salesCount y notifica al comercio con los datos reales', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(baseProduct())
      mockPrismaService.catalogOrder.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'order-1', ...data }))

      await service.createOrder(baseDto() as any, REQUESTER_ID)

      expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        data: { salesCount: { increment: 2 } },
      })
      expect(mockNotificationsService.notifyNewCatalogOrder).toHaveBeenCalledWith(
        COMMERCE_ID, 'Cliente Uno', 'Torta de chocolate', 2, 50,
      )
    })
  })
})
