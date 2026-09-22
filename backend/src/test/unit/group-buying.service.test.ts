import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { GroupBuyingService } from '../../domains/commerce-core/group-buying/group-buying.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PLATFORM_FEES_FACADE } from '../../domains/money/platform-fees/platform-fees.facade'
import { GroupBuyingCampaignStatus } from '@prisma/client'

describe('GroupBuyingService', () => {
  let service: GroupBuyingService

  const mockPrismaService: any = {
    groupBuyingCampaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pledge: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => unknown) => callback(mockPrismaService)),
  }

  const mockPlatformFeesFacade = {
    resolveFeeConfig: jest.fn(),
    calculateFee: jest.fn(),
    chargeProviderFee: jest.fn(),
  }

  const organizerId = 'organizer-1'
  const commerceId = 'commerce-1'

  const priceTiers = [
    { minQuantity: 100, unitPrice: 5 },
    { minQuantity: 500, unitPrice: 4 },
    { minQuantity: 1000, unitPrice: 3 },
  ]

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupBuyingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFeesFacade },
      ],
    }).compile()

    service = module.get<GroupBuyingService>(GroupBuyingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createCampaign', () => {
    const futureDeadline = new Date(Date.now() + 7 * 86_400_000).toISOString()

    it('throws BadRequestException when the deadline is not in the future', async () => {
      await expect(
        service.createCampaign(organizerId, {
          title: 'Aceite en volumen', unit: 'caja', currencyCode: 'usd', priceTiers,
          deadline: new Date(Date.now() - 1000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when two tiers share the same minQuantity', async () => {
      await expect(
        service.createCampaign(organizerId, {
          title: 'Aceite en volumen', unit: 'caja', currencyCode: 'usd',
          priceTiers: [{ minQuantity: 100, unitPrice: 5 }, { minQuantity: 100, unitPrice: 4 }],
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('sorts tiers by minQuantity ascending before persisting', async () => {
      mockPrismaService.groupBuyingCampaign.create.mockResolvedValue({ id: 'campaign-1' })

      await service.createCampaign(organizerId, {
        title: 'Aceite en volumen', unit: 'caja', currencyCode: 'usd',
        priceTiers: [{ minQuantity: 500, unitPrice: 4 }, { minQuantity: 100, unitPrice: 5 }],
        deadline: futureDeadline,
      })

      const call = mockPrismaService.groupBuyingCampaign.create.mock.calls[0][0]
      expect(call.data.priceTiers.map((t: any) => t.minQuantity)).toEqual([100, 500])
    })
  })

  describe('pledge', () => {
    it('throws NotFoundException when the campaign does not exist', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue(null)

      await expect(service.pledge('campaign-1', commerceId, { quantity: 50 })).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when the campaign is not OPEN', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.CLOSED, deadline: new Date(Date.now() + 86_400_000),
      })

      await expect(service.pledge('campaign-1', commerceId, { quantity: 50 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when the deadline already passed', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN, deadline: new Date(Date.now() - 1000),
      })

      await expect(service.pledge('campaign-1', commerceId, { quantity: 50 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when the commerce already has an active pledge', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN, deadline: new Date(Date.now() + 86_400_000),
      })
      mockPrismaService.pledge.findUnique.mockResolvedValue({ id: 'pledge-1', cancelled: false })

      await expect(service.pledge('campaign-1', commerceId, { quantity: 50 })).rejects.toThrow(BadRequestException)
    })

    it('reactivates a previously cancelled pledge instead of creating a duplicate', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN, deadline: new Date(Date.now() + 86_400_000),
      })
      mockPrismaService.pledge.findUnique.mockResolvedValue({ id: 'pledge-1', cancelled: true })
      mockPrismaService.pledge.update.mockResolvedValue({ id: 'pledge-1', quantity: 80, cancelled: false })

      await service.pledge('campaign-1', commerceId, { quantity: 80 })

      expect(mockPrismaService.pledge.update).toHaveBeenCalledWith({
        where: { id: 'pledge-1' },
        data: { quantity: 80, cancelled: false },
      })
      expect(mockPrismaService.pledge.create).not.toHaveBeenCalled()
    })

    it('creates a new pledge when there is no prior one', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN, deadline: new Date(Date.now() + 86_400_000),
      })
      mockPrismaService.pledge.findUnique.mockResolvedValue(null)
      mockPrismaService.pledge.create.mockResolvedValue({ id: 'pledge-1' })

      await service.pledge('campaign-1', commerceId, { quantity: 60 })

      expect(mockPrismaService.pledge.create).toHaveBeenCalledWith({
        data: { campaignId: 'campaign-1', commerceId, quantity: 60 },
      })
    })
  })

  describe('cancelPledge', () => {
    it('throws NotFoundException when there is no active pledge to cancel', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN,
      })
      mockPrismaService.pledge.findUnique.mockResolvedValue(null)

      await expect(service.cancelPledge('campaign-1', commerceId)).rejects.toThrow(NotFoundException)
    })

    it('marks the pledge as cancelled', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', status: GroupBuyingCampaignStatus.OPEN,
      })
      mockPrismaService.pledge.findUnique.mockResolvedValue({ id: 'pledge-1', cancelled: false })

      await service.cancelPledge('campaign-1', commerceId)

      expect(mockPrismaService.pledge.update).toHaveBeenCalledWith({
        where: { id: 'pledge-1' },
        data: { cancelled: true },
      })
    })
  })

  describe('close', () => {
    it('throws ForbiddenException when the caller is not the organizer', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', organizerId: 'someone-else', status: GroupBuyingCampaignStatus.OPEN, pledges: [],
      })

      await expect(service.close('campaign-1', organizerId)).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when the campaign is not OPEN', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1', organizerId, status: GroupBuyingCampaignStatus.CLOSED, pledges: [],
      })

      await expect(service.close('campaign-1', organizerId)).rejects.toThrow(BadRequestException)
    })

    it('unlocks the best tier reached by the combined pledges and charges the fee on each one', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique
        .mockResolvedValueOnce({
          id: 'campaign-1',
          organizerId,
          status: GroupBuyingCampaignStatus.OPEN,
          priceTiers,
          pledges: [
            { id: 'pledge-1', quantity: 300, cancelled: false },
            { id: 'pledge-2', quantity: 250, cancelled: false }, // total 550 -> tier de 500 ($4)
          ],
        })
        .mockResolvedValueOnce({
          id: 'campaign-1',
          organizer: { id: organizerId },
          priceTiers,
          pledges: [],
        })
      mockPlatformFeesFacade.resolveFeeConfig.mockResolvedValue({ rate: 5, payer: 'PROVIDER' })
      mockPlatformFeesFacade.calculateFee
        .mockReturnValueOnce({ feeAmount: 60 }) // 300*4*5% = 60
        .mockReturnValueOnce({ feeAmount: 50 }) // 250*4*5% = 50

      await service.close('campaign-1', organizerId)

      expect(mockPrismaService.groupBuyingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: GroupBuyingCampaignStatus.CLOSED },
      })
      expect(mockPlatformFeesFacade.calculateFee).toHaveBeenNthCalledWith(1, 1200, { rate: 5, payer: 'PROVIDER' }) // 300 * $4
      expect(mockPlatformFeesFacade.calculateFee).toHaveBeenNthCalledWith(2, 1000, { rate: 5, payer: 'PROVIDER' }) // 250 * $4
      expect(mockPrismaService.pledge.update).toHaveBeenCalledWith({
        where: { id: 'pledge-1' },
        data: { platformFeeRate: 5, platformFeeAmount: 60 },
      })
    })

    it('does not charge any fee when no platform fee is configured for GROUP_BUYING', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique
        .mockResolvedValueOnce({
          id: 'campaign-1', organizerId, status: GroupBuyingCampaignStatus.OPEN, priceTiers,
          pledges: [{ id: 'pledge-1', quantity: 300, cancelled: false }],
        })
        .mockResolvedValueOnce({ id: 'campaign-1', organizer: { id: organizerId }, priceTiers, pledges: [] })
      mockPlatformFeesFacade.resolveFeeConfig.mockResolvedValue(null)

      await service.close('campaign-1', organizerId)

      expect(mockPlatformFeesFacade.calculateFee).not.toHaveBeenCalled()
      expect(mockPrismaService.pledge.update).not.toHaveBeenCalled()
    })
  })

  describe('withComputedFields (vía listOpen/getCampaign)', () => {
    it('computes totalQuantity, currentUnitPrice and nextTier from active pledges', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        organizer: { id: organizerId },
        priceTiers,
        pledges: [
          { quantity: 60, commerce: { id: 'c1', name: 'Comercio 1' } },
          { quantity: 50, commerce: { id: 'c2', name: 'Comercio 2' } },
        ],
      })

      const result = await service.getCampaign('campaign-1')

      expect(result.totalQuantity).toBe(110)
      expect(result.currentUnitPrice).toBe(5) // tramo de 100 unidades
      expect(result.nextTier).toEqual({ minQuantity: 500, unitPrice: 4, unitsToUnlock: 390 })
    })

    it('excludes cancelled pledges from the total and tier calculation', async () => {
      mockPrismaService.groupBuyingCampaign.findMany.mockResolvedValue([
        {
          id: 'campaign-1',
          organizer: { id: organizerId },
          priceTiers,
          pledges: [{ quantity: 500 }], // ya viene pre-filtrado (cancelled: false) por el where del findMany real
        },
      ])

      const result = await service.listOpen()

      expect(result[0].totalQuantity).toBe(500)
      expect(result[0].currentUnitPrice).toBe(4)
    })

    it('returns currentUnitPrice=null and no nextTier gap info when below the first tier', async () => {
      mockPrismaService.groupBuyingCampaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        organizer: { id: organizerId },
        priceTiers,
        pledges: [{ quantity: 10, commerce: { id: 'c1', name: 'Comercio 1' } }],
      })

      const result = await service.getCampaign('campaign-1')

      expect(result.currentUnitPrice).toBeNull()
      expect(result.nextTier).toEqual({ minQuantity: 100, unitPrice: 5, unitsToUnlock: 90 })
    })
  })
})
