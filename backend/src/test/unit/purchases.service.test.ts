import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { PurchasesService } from '../../domains/operations/purchases/purchases.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'

describe('PurchasesService', () => {
  let service: PurchasesService

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
    },
    purchase: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  }

  const mockExchangeRatesService = {
    findByCode: jest.fn(),
  }

  const mockNotificationsService = {
    notifyMarginDrop: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  const commerceId = 'commerce-1'
  const userId = 'user-1'

  beforeEach(async () => {
    jest.clearAllMocks()
    mockNotificationsService.notifyMarginDrop.mockResolvedValue(undefined)
    // checkMarginDrop() vuelve a consultar compras recientes tras crear una
    // — default a "sin historial" salvo que un test lo sobreescriba.
    mockPrismaService.purchase.findMany.mockResolvedValue([])

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRatesService, useValue: mockExchangeRatesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile()

    service = module.get<PurchasesService>(PurchasesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const dto = {
      productId: 'prod-1',
      quantity: 10,
      unitCost: 5,
      currencyCode: 'usd',
    }

    it('throws NotFoundException when product does not belong to commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null)

      await expect(service.create(commerceId, userId, dto as any)).rejects.toThrow(
        NotFoundException,
      )
      expect(mockPrismaService.purchase.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when supplier does not belong to commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockPrismaService.supplier.findFirst.mockResolvedValue(null)

      await expect(
        service.create(commerceId, userId, { ...dto, supplierId: 'sup-1' } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('uses rate 1 and skips exchange-rate lookup for USD purchases', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' })

      await service.create(commerceId, userId, dto as any)

      expect(mockExchangeRatesService.findByCode).not.toHaveBeenCalled()
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'USD',
            exchangeRateValue: 1,
            unitCostUsd: 5,
            exchangeRateSource: null,
            createdBy: userId,
          }),
        }),
      )
    })

    it('converts unitCost to USD using the resolved exchange rate for non-USD currencies', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockExchangeRatesService.findByCode.mockResolvedValue({
        rateToUsd: 40,
        source: 'BCV',
        syncSource: 'BCV_SCRAPING',
      })
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' })

      await service.create(commerceId, userId, { ...dto, currencyCode: 'ves', unitCost: 400 } as any)

      expect(mockExchangeRatesService.findByCode).toHaveBeenCalledWith('VES')
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'VES',
            exchangeRateValue: 40,
            unitCostUsd: 10,
            exchangeRateSource: 'BCV_SCRAPING',
          }),
        }),
      )
    })

    it('throws BadRequestException when the resolved exchange rate is invalid', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockExchangeRatesService.findByCode.mockResolvedValue({ rateToUsd: 0 })

      await expect(
        service.create(commerceId, userId, { ...dto, currencyCode: 'ves' } as any),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrismaService.purchase.create).not.toHaveBeenCalled()
    })

    it('fires the MARGIN_DROP notification when replacement margin erodes past the threshold', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
      })
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' })
      // Post-create recompute: compra reciente a $13 -> margen reposición 13.3%,
      // muy por debajo del histórico 33.3% (caída de 20pp, supera el umbral de 5pp).
      mockPrismaService.purchase.findMany.mockResolvedValue([{ unitCostUsd: 13 }])

      await service.create(commerceId, userId, dto as any)
      await new Promise(process.nextTick) // deja correr el .catch(() => {}) fire-and-forget

      expect(mockNotificationsService.notifyMarginDrop).toHaveBeenCalledWith(
        commerceId,
        'Aceite 1L',
        expect.closeTo(33.3, 1),
        expect.closeTo(13.3, 1),
      )
    })

    it('does not fire the notification when the margin barely moves', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
      })
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' })
      // Compra reciente a $10.20 -> margen reposición ~32%, caída de ~1.3pp: no cruza el umbral.
      mockPrismaService.purchase.findMany.mockResolvedValue([{ unitCostUsd: 10.2 }])

      await service.create(commerceId, userId, dto as any)
      await new Promise(process.nextTick)

      expect(mockNotificationsService.notifyMarginDrop).not.toHaveBeenCalled()
    })

    it('does not let a notification failure break purchase creation', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
      })
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' })
      mockPrismaService.purchase.findMany.mockResolvedValue([{ unitCostUsd: 13 }])
      mockNotificationsService.notifyMarginDrop.mockRejectedValue(new Error('gateway down'))

      const result = await service.create(commerceId, userId, dto as any)
      await new Promise(process.nextTick)

      expect(result).toEqual({ id: 'purchase-1' })
    })
  })

  describe('getReplacementCost', () => {
    it('throws NotFoundException when product does not exist for commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null)

      await expect(service.getReplacementCost('prod-1', commerceId)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('returns historical margin only when there is no purchase history', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        cost: 10,
        price: 15,
      })
      mockPrismaService.purchase.findMany.mockResolvedValue([])

      const result = await service.getReplacementCost('prod-1', commerceId)

      expect(result.hasPurchaseData).toBe(false)
      expect(result.marginHistoricalPct).toBeCloseTo(33.3, 1)
      expect(result.marginReplacementPct).toBeNull()
      expect(result.averageReplacementCostUsd).toBeNull()
    })

    it('computes replacement margin from recent purchases and flags margin erosion', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        cost: 10, // costo histórico: margen 33.3%
        price: 15,
      })
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 13 },
        { unitCostUsd: 13 },
      ])

      const result = await service.getReplacementCost('prod-1', commerceId)

      expect(result.hasPurchaseData).toBe(true)
      expect(result.lastPurchaseCostUsd).toBe(13)
      expect(result.averageReplacementCostUsd).toBe(13)
      expect(result.marginHistoricalPct).toBeCloseTo(33.3, 1)
      // margen sobre reposición: (15-13)/15 = 13.3% — bien por debajo del histórico
      expect(result.marginReplacementPct).toBeCloseTo(13.3, 1)
      expect(result.marginReplacementPct!).toBeLessThan(result.marginHistoricalPct!)
    })
  })
})
