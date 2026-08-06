import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BnplService } from '../../domains/money/bnpl/bnpl.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { TelegramService } from '../../domains/engagement/telegram/telegram.service'
import { SimulatedAdapter } from '../../domains/money/bnpl/adapters/simulated.adapter'
import { CasheaAdapter } from '../../domains/money/bnpl/adapters/cashea.adapter'
import { KreceAdapter } from '../../domains/money/bnpl/adapters/krece.adapter'

describe('BnplService', () => {
  let service: BnplService
  let mockPrismaService: any

  beforeEach(async () => {
    mockPrismaService = {
      bnplTransaction: { findFirst: jest.fn(), update: jest.fn() },
      order: { update: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BnplService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue(undefined) } },
        { provide: TelegramService, useValue: { notifyCustomer: jest.fn().mockResolvedValue(undefined) } },
        { provide: SimulatedAdapter, useValue: {} },
        { provide: CasheaAdapter, useValue: {} },
        { provide: KreceAdapter, useValue: {} },
      ],
    }).compile()

    service = module.get<BnplService>(BnplService)
  })

  describe('simulateResolve', () => {
    it('rechaza una externalReference que no tiene el prefijo SIM-', async () => {
      await expect(service.simulateResolve('CASHEA-real-ref-123', 'APPROVED')).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.bnplTransaction.findFirst).not.toHaveBeenCalled()
    })

    it('lanza NotFoundException si la transacción simulada no existe', async () => {
      mockPrismaService.bnplTransaction.findFirst.mockResolvedValue(null)

      await expect(service.simulateResolve('SIM-abc123', 'APPROVED')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('resuelve una transacción simulada válida y actualiza el pedido a PAID', async () => {
      mockPrismaService.bnplTransaction.findFirst.mockResolvedValue({
        id: 'tx-1', provider: 'CASHEA', orderId: 'order-1', commerceId: 'commerce-1',
        externalReference: 'SIM-abc123', installments: null, confirmedAt: null,
      })
      mockPrismaService.bnplTransaction.update.mockResolvedValue({ status: 'APPROVED' })
      mockPrismaService.order.update.mockResolvedValue({ orderNumber: 'ORD-1', customerId: null })

      const result = await service.simulateResolve('SIM-abc123', 'APPROVED')

      expect(result).toEqual({ received: true, matched: true, status: 'APPROVED' })
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'PAID' },
      })
    })
  })
})
