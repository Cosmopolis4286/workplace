import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BnplWebhookController } from '../../domains/money/bnpl/bnpl-webhook.controller'
import { BnplService } from '../../domains/money/bnpl/bnpl.service'

describe('BnplWebhookController', () => {
  let controller: BnplWebhookController
  const mockBnplService = { simulateResolve: jest.fn(), handleWebhook: jest.fn() }
  const mockConfigService = { get: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BnplWebhookController],
      providers: [
        { provide: BnplService, useValue: mockBnplService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    controller = module.get<BnplWebhookController>(BnplWebhookController)
  })

  describe('simulateResolve', () => {
    it('rechaza siempre que APP_ENV=production', () => {
      mockConfigService.get.mockReturnValue('production')

      expect(() => controller.simulateResolve('SIM-abc', 'APPROVED')).toThrow(ForbiddenException)
      expect(mockBnplService.simulateResolve).not.toHaveBeenCalled()
    })

    it('permite cuando APP_ENV no es production', () => {
      mockConfigService.get.mockReturnValue('development')
      mockBnplService.simulateResolve.mockResolvedValue({ received: true })

      controller.simulateResolve('SIM-abc', 'APPROVED')

      expect(mockBnplService.simulateResolve).toHaveBeenCalledWith('SIM-abc', 'APPROVED')
    })
  })
})
