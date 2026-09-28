import { Test, TestingModule } from '@nestjs/testing'
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BcvSyncService } from '../../domains/money/exchange-rates/bcv-sync.service'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService

  const mockPrismaService = {
    exchangeRate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    exchangeRateHistory: {
      create: jest.fn(),
    },
    purchase: { count: jest.fn() },
    supplierQuote: { count: jest.fn() },
    accountReceivable: { count: jest.fn() },
    accountPayable: { count: jest.fn() },
    groupBuyingCampaign: { count: jest.fn() },
  }

  const mockBcvSyncService = {
    syncCurrency: jest.fn(),
    getCurrentRate: jest.fn(),
    getSyncStatus: jest.fn(),
    setAutoSync: jest.fn(),
    ensureFreshRate: jest.fn(),
    getAllSyncStatuses: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BcvSyncService,
          useValue: mockBcvSyncService,
        },
      ],
    }).compile()

    service = module.get<ExchangeRatesService>(ExchangeRatesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return all active exchange rates', async () => {
      const mockRates = [
        { id: 'rate-1', code: 'USD', name: 'Dólar', rateToUsd: 1, isActive: true, isDefault: true },
        { id: 'rate-2', code: 'EUR', name: 'Euro', rateToUsd: 0.85, isActive: true, isDefault: false },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)

      const result = await service.findAll()

      expect(result).toEqual(mockRates)
      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      })
    })

    it('should include inactive rates when requested', async () => {
      const mockRates = [
        { id: 'rate-1', code: 'USD', isActive: true },
        { id: 'rate-2', code: 'VES', isActive: false },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)

      const result = await service.findAll(true)

      expect(result).toEqual(mockRates)
      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      })
    })

    it('triggers ensureFreshRate for auto-sync currencies without awaiting it (fire-and-forget)', async () => {
      // Antes de este fix, findAll() esperaba ensureFreshRate() antes de
      // responder — si el BCV estaba caído, un GET normal podía tardar hasta
      // ~40s. Ahora el sync se dispara en background y el request responde
      // de inmediato con lo que ya había en DB.
      const mockRates = [
        { id: 'rate-1', code: 'USD', isActive: true, autoSync: false },
        { id: 'rate-2', code: 'VES', isActive: true, autoSync: true },
      ]
      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)
      // La promesa nunca resuelve durante el test — si findAll() la esperara,
      // este test colgaría hasta el timeout de Jest.
      mockBcvSyncService.ensureFreshRate.mockReturnValue(undefined)

      const result = await service.findAll()

      expect(result).toEqual(mockRates)
      expect(mockBcvSyncService.ensureFreshRate).toHaveBeenCalledTimes(1)
      expect(mockBcvSyncService.ensureFreshRate).toHaveBeenCalledWith('VES')
      // Solo un findMany — no vuelve a leer la DB tras el sync (ya no espera su resultado).
      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('findOne', () => {
    it('should return exchange rate by id', async () => {
      const mockRate = {
        id: 'rate-123',
        code: 'USD',
        name: 'Dólar',
        rateToUsd: 1,
        isActive: true,
        isDefault: true,
      }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(mockRate)

      const result = await service.findOne('rate-123')

      expect(result).toEqual(mockRate)
      expect(mockPrismaService.exchangeRate.findUnique).toHaveBeenCalledWith({
        where: { id: 'rate-123' },
      })
    })

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)

      await expect(service.findOne('rate-999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findDefault', () => {
    it('returns the default rate without waiting on ensureFreshRate when autoSync is on (fire-and-forget)', async () => {
      const mockRate = { id: 'rate-1', code: 'VES', isDefault: true, isActive: true, autoSync: true }
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)
      mockBcvSyncService.ensureFreshRate.mockReturnValue(undefined)

      const result = await service.findDefault()

      expect(result).toEqual(mockRate)
      expect(mockBcvSyncService.ensureFreshRate).toHaveBeenCalledWith('VES')
      // Nunca vuelve a leer por id tras el sync — ya no espera su resultado.
      expect(mockPrismaService.exchangeRate.findUnique).not.toHaveBeenCalled()
    })

    it('does not call ensureFreshRate when autoSync is off', async () => {
      const mockRate = { id: 'rate-1', code: 'USD', isDefault: true, isActive: true, autoSync: false }
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)

      const result = await service.findDefault()

      expect(result).toEqual(mockRate)
      expect(mockBcvSyncService.ensureFreshRate).not.toHaveBeenCalled()
    })

    it('returns null when there is no default rate', async () => {
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      const result = await service.findDefault()

      expect(result).toBeNull()
      expect(mockBcvSyncService.ensureFreshRate).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    const userId = 'user-123'
    const createDto = {
      code: 'ves',
      name: 'Bolívar',
      symbol: 'Bs',
      rateToUsd: 35.5,
    }

    it('should create a new exchange rate successfully', async () => {
      const mockRate = {
        id: 'rate-new',
        code: 'VES',
        name: 'Bolívar',
        symbol: 'Bs',
        rateToUsd: 35.5,
        isActive: true,
        isDefault: false,
        updatedBy: userId,
      }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)
      mockPrismaService.exchangeRate.create.mockResolvedValue(mockRate)

      const result = await service.create(createDto, userId)

      expect(result).toEqual(mockRate)
      expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'VES',
            updatedBy: userId,
          }),
        })
      )
    })

    it('should throw ConflictException for duplicate code', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(service.create(createDto, userId)).rejects.toThrow(ConflictException)
    })

    it('should unset previous default when creating a new default', async () => {
      const dtoWithDefault = { ...createDto, isDefault: true }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)
      mockPrismaService.exchangeRate.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.exchangeRate.create.mockResolvedValue({ id: 'new', code: 'VES', isDefault: true })

      await service.create(dtoWithDefault, userId)

      expect(mockPrismaService.exchangeRate.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    })
  })

  describe('update', () => {
    const userId = 'user-123'

    it('should update exchange rate successfully', async () => {
      const existingRate = { id: 'rate-123', code: 'VES', rateToUsd: 35.5, isDefault: false }
      const updateDto = { rateToUsd: 36.0 }
      const updatedRate = { ...existingRate, rateToUsd: 36.0, updatedBy: userId }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(existingRate)
      mockPrismaService.exchangeRate.update.mockResolvedValue(updatedRate)

      const result = await service.update('rate-123', updateDto, userId)

      expect(result).toEqual(updatedRate)
      expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
        where: { id: 'rate-123' },
        data: expect.objectContaining({ rateToUsd: 36.0, updatedBy: userId }),
      })
    })

    it('should throw NotFoundException if rate not found', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)

      await expect(service.update('rate-999', { rateToUsd: 36 }, userId)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('remove', () => {
    it('should delete a non-default exchange rate', async () => {
      const existingRate = { id: 'rate-123', code: 'VES', isDefault: false, isActive: true }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(existingRate)
      mockPrismaService.exchangeRate.delete.mockResolvedValue(existingRate)

      const result = await service.remove('rate-123')

      expect(result).toEqual(existingRate)
      expect(mockPrismaService.exchangeRate.delete).toHaveBeenCalledWith({
        where: { id: 'rate-123' },
      })
    })

    it('should throw BadRequestException when deleting the default rate', async () => {
      const defaultRate = { id: 'rate-123', code: 'USD', isDefault: true, isActive: true }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(defaultRate)

      await expect(service.remove('rate-123')).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException if rate not found', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)

      await expect(service.remove('rate-999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUsageCount', () => {
    it('sums usage across all 5 models that reference currencyCode', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue({ id: 'rate-123', code: 'COP' })
      mockPrismaService.purchase.count.mockResolvedValue(3)
      mockPrismaService.supplierQuote.count.mockResolvedValue(2)
      mockPrismaService.accountReceivable.count.mockResolvedValue(1)
      mockPrismaService.accountPayable.count.mockResolvedValue(0)
      mockPrismaService.groupBuyingCampaign.count.mockResolvedValue(4)

      const result = await service.getUsageCount('rate-123')

      expect(result).toEqual({
        code: 'COP',
        total: 10,
        breakdown: { purchases: 3, supplierQuotes: 2, receivables: 1, payables: 0, groupBuying: 4 },
      })
      expect(mockPrismaService.purchase.count).toHaveBeenCalledWith({ where: { currencyCode: 'COP' } })
      expect(mockPrismaService.supplierQuote.count).toHaveBeenCalledWith({ where: { currencyCode: 'COP' } })
      expect(mockPrismaService.accountReceivable.count).toHaveBeenCalledWith({ where: { currencyCode: 'COP' } })
      expect(mockPrismaService.accountPayable.count).toHaveBeenCalledWith({ where: { currencyCode: 'COP' } })
      expect(mockPrismaService.groupBuyingCampaign.count).toHaveBeenCalledWith({ where: { currencyCode: 'COP' } })
    })

    it('returns total 0 when the currency is unused', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue({ id: 'rate-123', code: 'EUR' })
      mockPrismaService.purchase.count.mockResolvedValue(0)
      mockPrismaService.supplierQuote.count.mockResolvedValue(0)
      mockPrismaService.accountReceivable.count.mockResolvedValue(0)
      mockPrismaService.accountPayable.count.mockResolvedValue(0)
      mockPrismaService.groupBuyingCampaign.count.mockResolvedValue(0)

      const result = await service.getUsageCount('rate-123')

      expect(result.total).toBe(0)
    })

    it('should throw NotFoundException if rate not found', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null)

      await expect(service.getUsageCount('rate-999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getStats', () => {
    it('should return exchange rate statistics', async () => {
      mockPrismaService.exchangeRate.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue({
        id: 'rate-1',
        code: 'USD',
        rateToUsd: 1,
      })

      const result = await service.getStats()

      expect(result).toEqual({
        total: 3,
        active: 2,
        inactive: 1,
        defaultCurrency: 'USD',
        defaultRate: 1,
      })
    })

    it('should return null defaultCurrency when no default is set', async () => {
      mockPrismaService.exchangeRate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      const result = await service.getStats()

      expect(result.defaultCurrency).toBeNull()
      expect(result.defaultRate).toBeNull()
    })
  })

  describe('setDefault', () => {
    it('should set a rate as default', async () => {
      const userId = 'user-123'
      const rate = { id: 'rate-123', code: 'EUR', isActive: true, isDefault: false }
      const updatedRate = { ...rate, isDefault: true }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(rate)
      mockPrismaService.exchangeRate.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.exchangeRate.update.mockResolvedValue(updatedRate)

      const result = await service.setDefault('rate-123', userId)

      expect(result).toEqual(updatedRate)
    })

    it('should throw BadRequestException when setting inactive rate as default', async () => {
      const userId = 'user-123'
      const inactiveRate = { id: 'rate-123', code: 'VES', isActive: false, isDefault: false }

      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(inactiveRate)

      await expect(service.setDefault('rate-123', userId)).rejects.toThrow(BadRequestException)
    })
  })
})
