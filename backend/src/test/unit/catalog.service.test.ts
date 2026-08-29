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
  const BUNDLE_ID = 'bundle-1'
  const COMPONENT_ID = 'component-1'
  const COMMERCE_ID = 'commerce-1'

  function baseProduct(overrides: Partial<any> = {}) {
    return {
      id: PRODUCT_ID,
      name: 'Torta de chocolate',
      price: 25,
      status: ProductStatus.AVAILABLE,
      forSale: true,
      isBundle: false,
      commerceId: COMMERCE_ID,
      commerce: { name: 'Pastelería Ana' },
      bundleItems: [],
      ...overrides,
    }
  }

  function baseDto(overrides: Partial<any> = {}) {
    return {
      commerceId: COMMERCE_ID,
      items: [{ productId: PRODUCT_ID, quantity: 2 }],
      deliveryType: 'HOME_DELIVERY',
      buyerName: 'Cliente Uno',
      buyerPhone: '+58111',
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      product: { findMany: jest.fn(), updateMany: jest.fn() },
      catalogOrder: { create: jest.fn() },
      commerce: { findUnique: jest.fn() },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(mockPrismaService)),
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
      mockPrismaService.product.findMany.mockResolvedValue([])

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled()
    })

    it('lanza NotFoundException si el producto no está disponible (forSale=false)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct({ forSale: false })])

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('lanza NotFoundException si el producto no está AVAILABLE', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct({ status: ProductStatus.OUT_OF_STOCK })])

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rechaza si el commerceId del body no coincide con el dueño real del producto', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct({ commerceId: 'otro-comercio' })])

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled()
    })

    it('deriva productName/commerceName/unitPrice/totalEstimate del producto real, no del body', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()])
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.catalogOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      )

      const result = await service.createOrder(baseDto() as any, REQUESTER_ID)

      expect(result.data.commerceName).toBe('Pastelería Ana')
      expect(result.data.totalEstimate).toBe(50) // price 25 * quantity 2
      expect(result.data.items[0]).toMatchObject({
        productId: PRODUCT_ID, productName: 'Torta de chocolate', unitPrice: 25, quantity: 2, isBundle: false,
      })
    })

    it('descuenta stock del producto y rechaza si no alcanza (stock insuficiente)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()])
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.createOrder(baseDto() as any, REQUESTER_ID)).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled()
    })

    it('un pack (isBundle) descuenta stock de sus componentes, no de sí mismo', async () => {
      const bundle = baseProduct({
        id: BUNDLE_ID,
        name: 'Combo Familiar',
        price: 40,
        isBundle: true,
        bundleItems: [{ componentProductId: COMPONENT_ID, quantity: 2 }],
      })
      mockPrismaService.product.findMany.mockResolvedValue([bundle])
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.catalogOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      )

      await service.createOrder(baseDto({ items: [{ productId: BUNDLE_ID, quantity: 3 }] }) as any, REQUESTER_ID)

      // 3 packs x 2 unidades del componente por pack = 6 a descontar del componente
      expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
        where: { id: COMPONENT_ID, stock: { gte: 6 } },
        data: { stock: { decrement: 6 } },
      })
      // El pack en sí nunca se descuenta como stock propio
      expect(mockPrismaService.product.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: BUNDLE_ID, stock: expect.anything() }) })
      )
    })

    it('incrementa salesCount y notifica al comercio con los datos reales', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()])
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.catalogOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      )

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

  describe('getStoreBySlug', () => {
    function baseCommerce(overrides: Partial<any> = {}) {
      return {
        id: COMMERCE_ID,
        userId: 'owner-1',
        name: 'Pastelería Ana',
        isPublic: true,
        description: null,
        socialLinks: null,
        user: { avatar: null, coverImage: null },
        settings: null,
        _count: { products: 3 },
        ...overrides,
      }
    }

    it('lanza NotFoundException si el slug no existe', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(null)

      await expect(service.getStoreBySlug('inexistente')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('lanza NotFoundException si la tienda está oculta (isPublic=false) y quien pide no es el dueño', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(baseCommerce({ isPublic: false }))

      await expect(service.getStoreBySlug('mi-tienda', 'otro-usuario')).rejects.toBeInstanceOf(NotFoundException)
      await expect(service.getStoreBySlug('mi-tienda')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('permite al dueño ver su propia tienda aunque esté oculta (isPublic=false)', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(baseCommerce({ isPublic: false }))

      const result = await service.getStoreBySlug('mi-tienda', 'owner-1')

      expect(result.data.name).toBe('Pastelería Ana')
      expect(result.data.productCount).toBe(3)
    })

    it('devuelve la tienda pública normalmente y no filtra el userId interno', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(baseCommerce())

      const result = await service.getStoreBySlug('mi-tienda')

      expect(result.data.productCount).toBe(3)
      expect((result.data as any).userId).toBeUndefined()
    })
  })
})
