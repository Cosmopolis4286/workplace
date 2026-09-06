import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { AlertEngineService } from '../../domains/operations/alert-engine/alert-engine.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertType } from '@prisma/client'

describe('AlertEngineService', () => {
  let service: AlertEngineService

  const mockPrismaService = {
    alertRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  }

  const commerceId = 'commerce-1'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<AlertEngineService>(AlertEngineService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getThreshold', () => {
    it('returns the factory default when the commerce has no custom rule', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue(null)

      const threshold = await service.getThreshold(commerceId, AlertType.MARGIN_DROP)

      expect(threshold).toBe(5)
    })

    it('returns the custom threshold when the commerce has an enabled rule', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue({
        thresholdValue: 15, enabled: true,
      })

      const threshold = await service.getThreshold(commerceId, AlertType.MARGIN_DROP)

      expect(threshold).toBe(15)
    })

    it('falls back to the factory default when the custom rule is disabled', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue({
        thresholdValue: 15, enabled: false,
      })

      const threshold = await service.getThreshold(commerceId, AlertType.MARGIN_DROP)

      expect(threshold).toBe(5)
    })
  })

  describe('shouldFire', () => {
    it('fires when the observed value meets the factory default threshold', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue(null)

      expect(await service.shouldFire(commerceId, AlertType.MARGIN_DROP, 5)).toBe(true)
      expect(await service.shouldFire(commerceId, AlertType.MARGIN_DROP, 4.9)).toBe(false)
    })

    it('uses the custom threshold when one exists and is enabled', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue({
        thresholdValue: 20, enabled: true,
      })

      expect(await service.shouldFire(commerceId, AlertType.MARGIN_DROP, 15)).toBe(false)
      expect(await service.shouldFire(commerceId, AlertType.MARGIN_DROP, 20)).toBe(true)
    })

    it('never fires when the rule is explicitly disabled, regardless of the observed value', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue({
        thresholdValue: 1, enabled: false,
      })

      expect(await service.shouldFire(commerceId, AlertType.MARGIN_DROP, 999)).toBe(false)
    })
  })

  describe('listRules', () => {
    it('returns all 4 alert types with factory defaults when the commerce customized none', async () => {
      mockPrismaService.alertRule.findMany.mockResolvedValue([])

      const rules = await service.listRules(commerceId)

      expect(rules).toHaveLength(4)
      expect(rules.every((r) => r.isDefault)).toBe(true)
      expect(rules.find((r) => r.alertType === AlertType.MARGIN_DROP)?.thresholdValue).toBe(5)
    })

    it('merges a customized rule with the defaults for the rest', async () => {
      mockPrismaService.alertRule.findMany.mockResolvedValue([
        { alertType: AlertType.MARGIN_DROP, thresholdValue: 10, enabled: true },
      ])

      const rules = await service.listRules(commerceId)

      const margin = rules.find((r) => r.alertType === AlertType.MARGIN_DROP)!
      const others = rules.filter((r) => r.alertType !== AlertType.MARGIN_DROP)

      expect(margin.thresholdValue).toBe(10)
      expect(margin.isDefault).toBe(false)
      expect(others.every((r) => r.isDefault)).toBe(true)
    })
  })

  describe('upsertRule', () => {
    it('creates or updates the rule for that commerce+alertType', async () => {
      mockPrismaService.alertRule.upsert.mockResolvedValue({ id: 'rule-1' })

      await service.upsertRule(commerceId, { alertType: AlertType.MARGIN_DROP, thresholdValue: 12 })

      expect(mockPrismaService.alertRule.upsert).toHaveBeenCalledWith({
        where: { commerceId_alertType: { commerceId, alertType: AlertType.MARGIN_DROP } },
        create: { commerceId, alertType: AlertType.MARGIN_DROP, thresholdValue: 12, enabled: true },
        update: { thresholdValue: 12, enabled: true },
      })
    })

    it('respects an explicit enabled=false', async () => {
      mockPrismaService.alertRule.upsert.mockResolvedValue({ id: 'rule-1' })

      await service.upsertRule(commerceId, { alertType: AlertType.MARGIN_DROP, thresholdValue: 12, enabled: false })

      expect(mockPrismaService.alertRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ enabled: false }),
          update: expect.objectContaining({ enabled: false }),
        }),
      )
    })
  })

  describe('resetRule', () => {
    it('throws NotFoundException when there is no custom rule to reset', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue(null)

      await expect(service.resetRule(commerceId, AlertType.MARGIN_DROP)).rejects.toThrow(NotFoundException)
    })

    it('deletes the custom rule and returns the factory default', async () => {
      mockPrismaService.alertRule.findUnique.mockResolvedValue({ id: 'rule-1' })

      const result = await service.resetRule(commerceId, AlertType.MARGIN_DROP)

      expect(mockPrismaService.alertRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } })
      expect(result).toEqual({ alertType: AlertType.MARGIN_DROP, thresholdValue: 5, enabled: true, isDefault: true })
    })
  })
})
