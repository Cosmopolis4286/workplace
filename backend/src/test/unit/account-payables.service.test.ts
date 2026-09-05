import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { AccountPayablesService } from '../../domains/money/accounts/account-payables.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service'
import { AccountStatus } from '@prisma/client'

describe('AccountPayablesService', () => {
  let service: AccountPayablesService

  const mockPrismaService = {
    supplier: { findFirst: jest.fn() },
    purchase: { findFirst: jest.fn() },
    accountPayable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  const mockExchangeRatesService = {
    resolveRateToUsd: jest.fn(),
  }

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  }

  const commerceId = 'commerce-1'
  const userId = 'user-1'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountPayablesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRatesService, useValue: mockExchangeRatesService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile()

    service = module.get<AccountPayablesService>(AccountPayablesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const dto = { description: 'Compra a crédito', amount: 200, currencyCode: 'usd' }

    it('throws NotFoundException when supplier does not belong to commerce', async () => {
      mockPrismaService.supplier.findFirst.mockResolvedValue(null)

      await expect(
        service.create(commerceId, userId, { ...dto, supplierId: 'sup-1' } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when purchase does not belong to commerce', async () => {
      mockPrismaService.purchase.findFirst.mockResolvedValue(null)

      await expect(
        service.create(commerceId, userId, { ...dto, purchaseId: 'purchase-1' } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when the exchange rate is invalid', async () => {
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue(null)

      await expect(
        service.create(commerceId, userId, { ...dto, currencyCode: 'ves' } as any),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrismaService.accountPayable.create).not.toHaveBeenCalled()
    })

    it('stores an immutable exchange rate snapshot converted to USD', async () => {
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({ rateToUsd: 40 })
      mockPrismaService.accountPayable.create.mockResolvedValue({ id: 'pay-1' })

      await service.create(commerceId, userId, { ...dto, currencyCode: 'ves', amount: 8000 } as any)

      expect(mockPrismaService.accountPayable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'VES',
            exchangeRateValue: 40,
            amountUsd: 200,
            createdBy: userId,
          }),
        }),
      )
    })
  })

  describe('markAsPaid', () => {
    it('throws NotFoundException when the payable does not belong to the commerce', async () => {
      mockPrismaService.accountPayable.findFirst.mockResolvedValue(null)

      await expect(service.markAsPaid('pay-1', commerceId)).rejects.toThrow(NotFoundException)
    })

    it('marks it as PAID with a paidAt timestamp', async () => {
      mockPrismaService.accountPayable.findFirst.mockResolvedValue({ id: 'pay-1', commerceId })

      await service.markAsPaid('pay-1', commerceId)

      expect(mockPrismaService.accountPayable.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: AccountStatus.PAID, paidAt: expect.any(Date) },
      })
    })
  })

  describe('remove', () => {
    it('deletes only after confirming ownership', async () => {
      mockPrismaService.accountPayable.findFirst.mockResolvedValue({ id: 'pay-1', commerceId })

      await service.remove('pay-1', commerceId)

      expect(mockPrismaService.accountPayable.delete).toHaveBeenCalledWith({ where: { id: 'pay-1' } })
    })
  })
})
