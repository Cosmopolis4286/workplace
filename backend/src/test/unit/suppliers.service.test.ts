import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { SuppliersService } from '../../domains/operations/suppliers/suppliers.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { AlertEngineService } from '../../domains/operations/alert-engine/alert-engine.service'

describe('SuppliersService', () => {
  let service: SuppliersService

  const mockPrismaService = {
    supplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    supplierQuote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  }

  const mockExchangeRatesService = {
    resolveRateToUsd: jest.fn(),
  }

  const mockNotificationsService = {
    notifySupplierPriceChange: jest.fn(),
  }

  const mockAlertEngineService = {
    shouldFire: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  const commerceId = 'commerce-1'

  beforeEach(async () => {
    jest.clearAllMocks()
    mockNotificationsService.notifySupplierPriceChange.mockResolvedValue(undefined)
    mockAlertEngineService.shouldFire.mockResolvedValue(false)
    // checkSupplierPriceChange() vuelve a consultar la cotización anterior
    // tras crear una — default a "sin cotización previa" salvo que un test lo sobreescriba.
    mockPrismaService.supplierQuote.findFirst.mockResolvedValue(null)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRatesService, useValue: mockExchangeRatesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AlertEngineService, useValue: mockAlertEngineService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile()

    service = module.get<SuppliersService>(SuppliersService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('throws ConflictException when a supplier with the same name exists for the commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1' })

      await expect(
        service.create(commerceId, { name: 'Distribuidora ABC' } as any),
      ).rejects.toThrow(ConflictException)
      expect(mockPrismaService.supplier.create).not.toHaveBeenCalled()
    })

    it('creates the supplier scoped to the commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null)
      mockPrismaService.supplier.create.mockResolvedValue({ id: 'sup-1', name: 'Distribuidora ABC' })

      await service.create(commerceId, { name: 'Distribuidora ABC' } as any)

      expect(mockPrismaService.supplier.create).toHaveBeenCalledWith({
        data: { name: 'Distribuidora ABC', commerceId },
      })
    })
  })

  describe('findOne / remove', () => {
    it('throws NotFoundException when the supplier does not belong to the commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null)

      await expect(service.findOne('sup-1', commerceId)).rejects.toThrow(NotFoundException)
    })

    it('deletes only after confirming ownership', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })

      await service.remove('sup-1', commerceId)

      expect(mockPrismaService.supplier.delete).toHaveBeenCalledWith({ where: { id: 'sup-1' } })
    })
  })

  describe('createQuote', () => {
    const dto = { productId: 'prod-1', price: 100, currencyCode: 'usd' }

    it('throws NotFoundException when supplier does not belong to commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null)

      await expect(service.createQuote('sup-1', commerceId, dto as any)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws NotFoundException when product does not belong to commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue(null)

      await expect(service.createQuote('sup-1', commerceId, dto as any)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws BadRequestException when the exchange rate cannot be resolved', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue(null)

      await expect(
        service.createQuote('sup-1', commerceId, { ...dto, currencyCode: 'ves' } as any),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrismaService.supplierQuote.create).not.toHaveBeenCalled()
    })

    it('converts price to USD using the resolved rate and stores an immutable snapshot', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId })
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({ rateToUsd: 40, source: 'BCV_SCRAPING' })
      mockPrismaService.supplierQuote.create.mockResolvedValue({ id: 'quote-1' })

      await service.createQuote('sup-1', commerceId, { ...dto, currencyCode: 'ves', price: 4000 } as any)

      expect(mockPrismaService.supplierQuote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'VES',
            exchangeRateValue: 40,
            priceUsd: 100,
          }),
        }),
      )
    })

    it('fires SUPPLIER_PRICE_CHANGE when the Alert Engine says the increase crosses the threshold', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId, name: 'Aceite 1L' })
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({ rateToUsd: 1 })
      mockPrismaService.supplierQuote.create.mockResolvedValue({ id: 'quote-new' })
      // Cotización anterior a $100, la nueva es $112 -> +12%.
      mockPrismaService.supplierQuote.findFirst.mockResolvedValue({ id: 'quote-old', priceUsd: 100 })
      mockAlertEngineService.shouldFire.mockResolvedValue(true)

      await service.createQuote('sup-1', commerceId, { ...dto, price: 112 } as any)
      await new Promise(process.nextTick) // deja correr el .catch(() => {}) fire-and-forget

      expect(mockAlertEngineService.shouldFire).toHaveBeenCalledWith(
        commerceId,
        'SUPPLIER_PRICE_CHANGE',
        expect.closeTo(12, 1),
      )
      expect(mockNotificationsService.notifySupplierPriceChange).toHaveBeenCalledWith(
        commerceId,
        'Distribuidora ABC',
        'Aceite 1L',
        expect.closeTo(12, 1),
        30,
      )
    })

    it('does not fire SUPPLIER_PRICE_CHANGE when there is no previous quote to compare against', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId, name: 'Aceite 1L' })
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({ rateToUsd: 1 })
      mockPrismaService.supplierQuote.create.mockResolvedValue({ id: 'quote-new' })
      mockPrismaService.supplierQuote.findFirst.mockResolvedValue(null)

      await service.createQuote('sup-1', commerceId, dto as any)
      await new Promise(process.nextTick)

      expect(mockAlertEngineService.shouldFire).not.toHaveBeenCalled()
      expect(mockNotificationsService.notifySupplierPriceChange).not.toHaveBeenCalled()
    })

    it('does not let a notification failure break quote creation', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue({ id: 'sup-1', commerceId, name: 'Distribuidora ABC' })
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', commerceId, name: 'Aceite 1L' })
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({ rateToUsd: 1 })
      mockPrismaService.supplierQuote.create.mockResolvedValue({ id: 'quote-new' })
      mockPrismaService.supplierQuote.findFirst.mockResolvedValue({ id: 'quote-old', priceUsd: 100 })
      mockAlertEngineService.shouldFire.mockResolvedValue(true)
      mockNotificationsService.notifySupplierPriceChange.mockRejectedValue(new Error('gateway down'))

      const result = await service.createQuote('sup-1', commerceId, { ...dto, price: 112 } as any)
      await new Promise(process.nextTick)

      expect(result).toEqual({ id: 'quote-new' })
    })
  })

  describe('compareForProduct', () => {
    it('throws NotFoundException when the product does not belong to the commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null)

      await expect(service.compareForProduct('prod-1', commerceId)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('sorts suppliers by price and flags the cheapest one', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Aceite 1L' })
      mockPrismaService.supplierQuote.findMany.mockResolvedValue([
        {
          id: 'q2', supplierId: 'sup-2', priceUsd: 9, leadTimeDays: 6, available: true,
          quotedAt: new Date(), supplier: { id: 'sup-2', name: 'Proveedor B' },
        },
        {
          id: 'q1', supplierId: 'sup-1', priceUsd: 10, leadTimeDays: 2, available: true,
          quotedAt: new Date(), supplier: { id: 'sup-1', name: 'Proveedor A' },
        },
      ])

      const result = await service.compareForProduct('prod-1', commerceId)

      expect(result.quotes.map((q) => q.supplierId)).toEqual(['sup-2', 'sup-1'])
      expect(result.cheapestSupplierId).toBe('sup-2')
    })

    it('computes the price change % against the previous quote within the lookback window', async () => {
      const now = new Date()
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Aceite 1L' })
      mockPrismaService.supplierQuote.findMany.mockResolvedValue([
        {
          id: 'q-new', supplierId: 'sup-1', priceUsd: 11.2, leadTimeDays: 3, available: true,
          quotedAt: now, supplier: { id: 'sup-1', name: 'Proveedor A' },
        },
        {
          id: 'q-old', supplierId: 'sup-1', priceUsd: 10, leadTimeDays: 3, available: true,
          quotedAt: tenDaysAgo, supplier: { id: 'sup-1', name: 'Proveedor A' },
        },
      ])

      const result = await service.compareForProduct('prod-1', commerceId)

      expect(result.quotes[0].priceChangePct).toBeCloseTo(12, 0)
      expect(result.quotes[0].priceChangeLookbackDays).toBe(30)
    })

    it('returns null price change when there is no earlier quote to compare against', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Aceite 1L' })
      mockPrismaService.supplierQuote.findMany.mockResolvedValue([
        {
          id: 'q1', supplierId: 'sup-1', priceUsd: 10, leadTimeDays: 3, available: true,
          quotedAt: new Date(), supplier: { id: 'sup-1', name: 'Proveedor A' },
        },
      ])

      const result = await service.compareForProduct('prod-1', commerceId)

      expect(result.quotes[0].priceChangePct).toBeNull()
    })
  })
})
