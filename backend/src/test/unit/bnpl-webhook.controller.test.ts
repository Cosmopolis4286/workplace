import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BnplWebhookController } from '../../domains/money/bnpl/bnpl-webhook.controller'
import { BnplService } from '../../domains/money/bnpl/bnpl.service'
import { RateLimitGuard } from '../../common/guards/rate-limit.guard'

describe('BnplWebhookController', () => {
  let controller: BnplWebhookController
  const mockBnplService = { simulateResolve: jest.fn(), handleWebhook: jest.fn(), verifyWebhookSecret: jest.fn() }
  const mockConfigService = { get: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BnplWebhookController],
      providers: [
        { provide: BnplService, useValue: mockBnplService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      // Los tests llaman los métodos del controller directamente (no vía
      // HTTP), así que RateLimitGuard nunca se ejecuta de verdad — pero
      // Nest igual necesita poder instanciarlo como provider referenciado
      // en @UseGuards. Se reemplaza por un mock trivial en vez de proveer
      // sus dependencias reales (RedisService, I18nService).
      .overrideProvider(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<BnplWebhookController>(BnplWebhookController)
  })

  describe('handleCasheaWebhook', () => {
    it('rechaza sin el header de secreto', () => {
      mockBnplService.verifyWebhookSecret.mockReturnValue(false)

      expect(() => controller.handleCasheaWebhook({ externalReference: 'X' } as any, undefined)).toThrow(UnauthorizedException)
      expect(mockBnplService.handleWebhook).not.toHaveBeenCalled()
    })

    it('rechaza con un secreto incorrecto', () => {
      mockBnplService.verifyWebhookSecret.mockReturnValue(false)

      expect(() => controller.handleCasheaWebhook({ externalReference: 'X' } as any, 'wrong-secret')).toThrow(UnauthorizedException)
    })

    it('procesa el webhook cuando el secreto es válido', () => {
      mockBnplService.verifyWebhookSecret.mockReturnValue(true)
      mockBnplService.handleWebhook.mockResolvedValue({ received: true })

      controller.handleCasheaWebhook({ externalReference: 'X' } as any, 'correct-secret')

      expect(mockBnplService.verifyWebhookSecret).toHaveBeenCalledWith('CASHEA', 'correct-secret')
      expect(mockBnplService.handleWebhook).toHaveBeenCalledWith('CASHEA', { externalReference: 'X' })
    })
  })

  describe('handleKreceWebhook', () => {
    it('rechaza sin secreto válido', () => {
      mockBnplService.verifyWebhookSecret.mockReturnValue(false)

      expect(() => controller.handleKreceWebhook({ externalReference: 'X' } as any, undefined)).toThrow(UnauthorizedException)
    })

    it('procesa el webhook cuando el secreto es válido', () => {
      mockBnplService.verifyWebhookSecret.mockReturnValue(true)
      mockBnplService.handleWebhook.mockResolvedValue({ received: true })

      controller.handleKreceWebhook({ externalReference: 'X' } as any, 'correct-secret')

      expect(mockBnplService.verifyWebhookSecret).toHaveBeenCalledWith('KRECE', 'correct-secret')
      expect(mockBnplService.handleWebhook).toHaveBeenCalledWith('KRECE', { externalReference: 'X' })
    })
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
