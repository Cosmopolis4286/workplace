import { Test, TestingModule } from '@nestjs/testing'
import { EscrowService } from '../../domains/money/escrow/escrow.service'
import { PrismaService } from '../../prisma/prisma.service'
import { WalletsService } from '../../domains/money/wallets/wallets.service'

describe('EscrowService', () => {
  let service: EscrowService

  const mockPrismaService: any = {
    escrow: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  }

  const mockWalletsService = {
    holdEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundEscrow: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrismaService.escrow.findUnique.mockResolvedValue(null)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile()

    service = module.get<EscrowService>(EscrowService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('hold', () => {
    it('debits via WalletsService.holdEscrow before persisting the Escrow row', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.upsert.mockResolvedValue({
        id: 'e1', entityType: 'SERVICE_REQUEST', entityId: 'req-1',
        payerId: 'client-1', payeeId: 'provider-1', status: 'HELD', amount: 100,
        heldAt: new Date(), releasedAt: null, refundedAt: null,
      })

      await service.hold({
        entityType: 'SERVICE_REQUEST', entityId: 'req-1',
        payerId: 'client-1', payeeId: 'provider-1', deltaAmount: 100,
      })

      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith('client-1', 100, 'req-1', undefined)
    })

    it('does not persist any Escrow row when WalletsService.holdEscrow throws', async () => {
      mockWalletsService.holdEscrow.mockRejectedValue(new Error('insufficient funds'))

      await expect(
        service.hold({ entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1', deltaAmount: 50 }),
      ).rejects.toThrow('insufficient funds')

      expect(mockPrismaService.escrow.upsert).not.toHaveBeenCalled()
    })

    it('creates a new Escrow row with the delta as the total amount when none existed', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.findUnique.mockResolvedValue(null)
      mockPrismaService.escrow.upsert.mockImplementation(({ create }: any) => Promise.resolve({ ...create, id: 'e1' }))

      await service.hold({ entityType: 'CATALOG_ORDER', entityId: 'order-1', payerId: 'buyer-1', payeeId: 'commerce-user-1', deltaAmount: 200 })

      expect(mockPrismaService.escrow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ amount: 200, status: 'HELD' }) }),
      )
    })

    it('accumulates the delta on top of the existing amount instead of overwriting it (price-increase case)', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.findUnique.mockResolvedValue({ amount: 100 })
      mockPrismaService.escrow.upsert.mockImplementation(({ update }: any) => Promise.resolve({ ...update, id: 'e1' }))

      await service.hold({ entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1', deltaAmount: 50 })

      // 100 ya retenido + 50 de delta = 150 total, NUNCA 50 sobrescribiendo el total
      expect(mockPrismaService.escrow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ amount: 150 }) }),
      )
      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith('c1', 50, 'req-1', undefined) // solo el delta se debita
    })

    it('forwards referenceOverride to WalletsService.holdEscrow', async () => {
      mockWalletsService.holdEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.upsert.mockResolvedValue({ id: 'e1', entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1', status: 'HELD', amount: 50, heldAt: new Date(), releasedAt: null, refundedAt: null })

      await service.hold({
        entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1',
        deltaAmount: 50, referenceOverride: 'ESCROW-HOLD-INCREASE-proposal-1',
      })

      expect(mockWalletsService.holdEscrow).toHaveBeenCalledWith('c1', 50, 'req-1', 'ESCROW-HOLD-INCREASE-proposal-1')
    })
  })

  describe('release', () => {
    it('credits the payee via WalletsService.releaseEscrow and marks the Escrow row RELEASED', async () => {
      mockWalletsService.releaseEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.update.mockResolvedValue({
        id: 'e1', entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1',
        status: 'RELEASED', amount: 90, heldAt: new Date(), releasedAt: new Date(), refundedAt: null,
      })

      const result = await service.release({ entityType: 'SERVICE_REQUEST', entityId: 'req-1', payeeId: 'p1', amount: 90 })

      expect(mockWalletsService.releaseEscrow).toHaveBeenCalledWith('req-1', 'p1', 90)
      expect(mockPrismaService.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'RELEASED' }) }),
      )
      expect(result.status).toBe('RELEASED')
    })
  })

  describe('refund', () => {
    it('credits the payer via WalletsService.refundEscrow and marks the Escrow row REFUNDED', async () => {
      mockWalletsService.refundEscrow.mockResolvedValue({ transaction: {} })
      mockPrismaService.escrow.update.mockResolvedValue({
        id: 'e1', entityType: 'CATALOG_ORDER', entityId: 'order-1', payerId: 'buyer-1', payeeId: 'commerce-user-1',
        status: 'REFUNDED', amount: 200, heldAt: new Date(), releasedAt: null, refundedAt: new Date(),
      })

      const result = await service.refund({ entityType: 'CATALOG_ORDER', entityId: 'order-1', payerId: 'buyer-1', amount: 200 })

      expect(mockWalletsService.refundEscrow).toHaveBeenCalledWith('order-1', 'buyer-1', 200)
      expect(result.status).toBe('REFUNDED')
    })
  })

  describe('getByEntity', () => {
    it('returns null when there is no Escrow row for the entity', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue(null)
      expect(await service.getByEntity('SERVICE_REQUEST', 'req-1')).toBeNull()
    })

    it('maps the persisted row to an EscrowView', async () => {
      mockPrismaService.escrow.findUnique.mockResolvedValue({
        id: 'e1', entityType: 'SERVICE_REQUEST', entityId: 'req-1', payerId: 'c1', payeeId: 'p1',
        status: 'HELD', amount: 100, heldAt: new Date(), releasedAt: null, refundedAt: null,
      })

      const result = await service.getByEntity('SERVICE_REQUEST', 'req-1')

      expect(result).toMatchObject({ id: 'e1', status: 'HELD', amount: 100 })
    })
  })
})
