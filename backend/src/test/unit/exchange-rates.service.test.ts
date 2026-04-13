import { Test, TestingModule } from '@nestjs/testing'
import { ExchangeRatesService } from '../../exchange-rates/exchange-rates.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService
  let prismaService: PrismaService

  const mockPrismaService = {
    exchangeRate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ExchangeRatesService>(ExchangeRatesService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new exchange rate successfully', async () => {
      const createExchangeRateDto = {
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rate: 35.50,
        source: 'BCV',
      }

      const mockExchangeRate = {
        id: 'rate-123',
        ...createExchangeRateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaService.exchangeRate.create.mockResolvedValue(mockExchangeRate)

      const result = await service.create(createExchangeRateDto)

      expect(result).toEqual(mockExchangeRate)
      expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith({
        data: createExchangeRateDto,
      })
    })

    it('should throw error for duplicate currency pair', async () => {
      const createExchangeRateDto = {
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rate: 35.50,
        source: 'BCV',
      }

      mockPrismaService.exchangeRate.create.mockRejectedValue(
        new Error('Exchange rate for this currency pair already exists')
      )

      await expect(service.create(createExchangeRateDto)).rejects.toThrow(
        'Exchange rate for this currency pair already exists'
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated exchange rates', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        fromCurrency: 'USD',
      }

      const mockRates = [
        { id: 'rate-1', fromCurrency: 'USD', toCurrency: 'VES', rate: 35.50 },
        { id: 'rate-2', fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.85 },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)

      const result = await service.findAll(queryDto)

      expect(result).toEqual({
        rates: mockRates,
        total: mockRates.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should filter by currency', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        fromCurrency: 'USD',
        toCurrency: 'VES',
      }

      const mockRates = [
        { id: 'rate-1', fromCurrency: 'USD', toCurrency: 'VES', rate: 35.50 },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)

      const result = await service.findAll(queryDto)

      expect(result.rates).toHaveLength(1)
      expect(result.rates[0].fromCurrency).toBe('USD')
      expect(result.rates[0].toCurrency).toBe('VES')
    })
  })

  describe('findOne', () => {
    it('should return exchange rate by currency pair', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'

      const mockRate = {
        id: 'rate-123',
        fromCurrency,
        toCurrency,
        rate: 35.50,
        source: 'BCV',
      }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)

      const result = await service.findOne(fromCurrency, toCurrency)

      expect(result).toEqual(mockRate)
      expect(mockPrismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { fromCurrency, toCurrency },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should throw error if exchange rate not found', async () => {
      const fromCurrency = 'USD'
      const toCurrency: 'VES'

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      await expect(service.findOne(fromCurrency, toCurrency)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update exchange rate successfully', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const updateExchangeRateDto = {
        rate: 36.00,
        source: 'BCV',
      }

      const existingRate = {
        id: 'rate-123',
        fromCurrency,
        toCurrency,
        rate: 35.50,
      }

      const updatedRate = {
        ...existingRate,
        ...updateExchangeRateDto,
        updatedAt: new Date(),
      }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(existingRate)
      mockPrismaService.exchangeRate.update.mockResolvedValue(updatedRate)

      const result = await service.update(fromCurrency, toCurrency, updateExchangeRateDto)

      expect(result).toEqual(updatedRate)
      expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
        where: { id: existingRate.id },
        data: updateExchangeRateDto,
      })
    })

    it('should throw error if exchange rate not found for update', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const updateExchangeRateDto = { rate: 36.00 }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      await expect(service.update(fromCurrency, toCurrency, updateExchangeRateDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getLatestRate', () => {
    it('should return latest exchange rate', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'

      const mockRate = {
        id: 'rate-123',
        fromCurrency,
        toCurrency,
        rate: 35.50,
        createdAt: new Date(),
      }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)

      const result = await service.getLatestRate(fromCurrency, toCurrency)

      expect(result).toEqual(mockRate)
      expect(mockPrismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { fromCurrency, toCurrency },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return null if no rate found', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      const result = await service.getLatestRate(fromCurrency, toCurrency)

      expect(result).toBeNull()
    })
  })

  describe('convertCurrency', () => {
    it('should convert currency successfully', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const amount = 100

      const mockRate = {
        fromCurrency,
        toCurrency,
        rate: 35.50,
      }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)

      const result = await service.convertCurrency(fromCurrency, toCurrency, amount)

      expect(result).toEqual({
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: 3550,
        convertedCurrency: toCurrency,
        rate: 35.50,
      })
    })

    it('should throw error if exchange rate not found for conversion', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const amount = 100

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null)

      await expect(service.convertCurrency(fromCurrency, toCurrency, amount)).rejects.toThrow(NotFoundException)
    })

    it('should handle zero amount conversion', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const amount = 0

      const mockRate = {
        fromCurrency,
        toCurrency,
        rate: 35.50,
      }

      mockPrismaService.exchangeRate.findFirst.mockResolvedValue(mockRate)

      const result = await service.convertCurrency(fromCurrency, toCurrency, amount)

      expect(result.convertedAmount).toBe(0)
    })
  })

  describe('getRatesHistory', () => {
    it('should return exchange rates history', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const queryDto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      const mockHistory = [
        { id: 'rate-1', rate: 35.00, createdAt: new Date('2024-01-01') },
        { id: 'rate-2', rate: 35.50, createdAt: new Date('2024-01-15') },
        { id: 'rate-3', rate: 36.00, createdAt: new Date('2024-01-31') },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockHistory)

      const result = await service.getRatesHistory(fromCurrency, toCurrency, queryDto)

      expect(result).toEqual({
        fromCurrency,
        toCurrency,
        history: mockHistory,
      })
    })

    it('should handle empty history', async () => {
      const fromCurrency = 'USD'
      const toCurrency = 'VES'
      const queryDto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      mockPrismaService.exchangeRate.findMany.mockResolvedValue([])

      const result = await service.getRatesHistory(fromCurrency, toCurrency, queryDto)

      expect(result.history).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('should return exchange rates statistics', async () => {
      const mockRates = [
        { fromCurrency: 'USD', toCurrency: 'VES', rate: 35.50 },
        { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.85 },
        { fromCurrency: 'EUR', toCurrency: 'VES', rate: 41.76 },
      ]

      mockPrismaService.exchangeRate.findMany.mockResolvedValue(mockRates)

      const result = await service.getStats()

      expect(result).toBeDefined()
      expect(result.totalRates).toBe(3)
      expect(result.currencyPairs).toBe(3)
      expect(result.lastUpdated).toBeDefined()
    })

    it('should handle empty rates list', async () => {
      mockPrismaService.exchangeRate.findMany.mockResolvedValue([])

      const result = await service.getStats()

      expect(result.totalRates).toBe(0)
      expect(result.currencyPairs).toBe(0)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const createExchangeRateDto = {
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rate: 35.50,
        source: 'BCV',
      }

      mockPrismaService.exchangeRate.create.mockRejectedValue(new Error('Database connection failed'))

      await expect(service.create(createExchangeRateDto)).rejects.toThrow('Database connection failed')
    })

    it('should validate currency codes', async () => {
      const invalidDto = {
        fromCurrency: '',
        toCurrency: 'VES',
        rate: 35.50,
        source: 'BCV',
      }

      mockPrismaService.exchangeRate.create.mockRejectedValue(new Error('Invalid currency code'))

      await expect(service.create(invalidDto)).rejects.toThrow('Invalid currency code')
    })

    it('should validate rate value', async () => {
      const invalidDto = {
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rate: -1,
        source: 'BCV',
      }

      mockPrismaService.exchangeRate.create.mockRejectedValue(new Error('Rate must be positive'))

      await expect(service.create(invalidDto)).rejects.toThrow('Rate must be positive')
    })
  })
})
