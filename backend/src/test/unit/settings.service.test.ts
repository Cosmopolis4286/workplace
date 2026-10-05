import { Test, TestingModule } from '@nestjs/testing'
import { SettingsService } from '../../domains/platform/settings/settings.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'
import { CapabilitiesService } from '../../common/capabilities/capabilities.service'
import { CommerceSettingsStrategy } from '../../domains/platform/settings/strategies/commerce-settings.strategy'
import { FreelancerSettingsStrategy } from '../../domains/platform/settings/strategies/freelancer-settings.strategy'
import { UpdateNotificationSettingsDto } from '../../domains/platform/settings/dto/update-settings.dto'

describe('SettingsService.getSettings', () => {
  let service: SettingsService
  let capabilities: { resolve: jest.Mock }
  let commerceStrategy: { getSettings: jest.Mock }
  let freelancerStrategy: { getSettings: jest.Mock }

  beforeEach(async () => {
    capabilities = { resolve: jest.fn() }
    commerceStrategy = { getSettings: jest.fn().mockResolvedValue({ commerce: { id: 'c1' }, settings: { operations: {}, priceGuard: {} } }) }
    freelancerStrategy = { getSettings: jest.fn().mockResolvedValue({ commerce: null, settings: { professionalName: 'x' } }) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: {} },
        { provide: RedisService, useValue: { del: jest.fn() } },
        { provide: PLAN_LIMITS_FACADE, useValue: { getSelectableModules: jest.fn() } },
        { provide: AccountTypeResolver, useValue: { resolve: jest.fn() } },
        { provide: CapabilitiesService, useValue: capabilities },
        { provide: CommerceSettingsStrategy, useValue: commerceStrategy },
        { provide: FreelancerSettingsStrategy, useValue: freelancerStrategy },
      ],
    }).compile()

    service = module.get<SettingsService>(SettingsService)
  })

  it('uses CommerceSettingsStrategy for a PROFESSIONAL with a Commerce ("opción 2", ej. categoría Comida) and no professional profile', async () => {
    // Caso real: un COMMERCE puro (perfil BUSINESS, sin perfil PROFESSIONAL
    // activo) — solo CommerceSettings, sin freelancerSettings agregado.
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: true, HAS_PROFESSIONAL_PROFILE: false, HAS_BUSINESS_PROFILE: true })

    const result = await service.getSettings('user-1')

    expect(commerceStrategy.getSettings).toHaveBeenCalledWith('user-1')
    expect(freelancerStrategy.getSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ commerce: { id: 'c1' }, settings: { operations: {}, priceGuard: {} } })
  })

  it('uses FreelancerSettingsStrategy for a PROFESSIONAL without a Commerce', async () => {
    // Caso real: freelancer@demo.com — Diseño Gráfico, sin producto físico,
    // nunca tiene Commerce.
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: false, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })

    const result = await service.getSettings('user-2')

    expect(freelancerStrategy.getSettings).toHaveBeenCalledWith('user-2')
    expect(commerceStrategy.getSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ commerce: null, settings: { professionalName: 'x' } })
  })

  it('adds freelancerSettings alongside CommerceSettings for a hybrid PROFESSIONAL ("opción 2" + perfil profesional activo, ej. comidarapida@demo.com)', async () => {
    // Caso real: María — categoría "Comida" (Commerce técnico, vende
    // platillos de precio fijo) Y perfil PROFESSIONAL/SERVICE_PROVIDER
    // activo (también cotiza servicios a medida, ej. catering). Antes del
    // fix, resolveStrategy() solo podía elegir UNA forma de respuesta —
    // perdía siempre uno de los dos conjuntos de settings.
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: true, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })

    const result = await service.getSettings('user-3')

    expect(commerceStrategy.getSettings).toHaveBeenCalledWith('user-3')
    expect(freelancerStrategy.getSettings).toHaveBeenCalledWith('user-3')
    expect(result).toEqual({
      commerce: { id: 'c1' },
      settings: { operations: {}, priceGuard: {} },
      freelancerSettings: { professionalName: 'x' },
    })
  })
})

describe('SettingsService.updateNotificationSettings', () => {
  let service: SettingsService
  let capabilities: { resolve: jest.Mock }
  let commerceStrategy: { updateNotificationSettings: jest.Mock }
  let freelancerStrategy: { updateNotificationSettings: jest.Mock }

  beforeEach(async () => {
    capabilities = { resolve: jest.fn() }
    commerceStrategy = { updateNotificationSettings: jest.fn().mockResolvedValue({ notifyNewOrders: true }) }
    freelancerStrategy = { updateNotificationSettings: jest.fn().mockResolvedValue({ notifyNewRequests: true }) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: {} },
        { provide: RedisService, useValue: { del: jest.fn() } },
        { provide: PLAN_LIMITS_FACADE, useValue: { getSelectableModules: jest.fn() } },
        { provide: AccountTypeResolver, useValue: { resolve: jest.fn() } },
        { provide: CapabilitiesService, useValue: capabilities },
        { provide: CommerceSettingsStrategy, useValue: commerceStrategy },
        { provide: FreelancerSettingsStrategy, useValue: freelancerStrategy },
      ],
    }).compile()

    service = module.get<SettingsService>(SettingsService)
  })

  it('updates only CommerceSettingsStrategy for a pure COMMERCE (no perfil profesional)', async () => {
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: true, HAS_PROFESSIONAL_PROFILE: false, HAS_BUSINESS_PROFILE: true })
    const dto = { notifyNewOrders: true } as UpdateNotificationSettingsDto

    const result = await service.updateNotificationSettings('user-1', dto)

    expect(commerceStrategy.updateNotificationSettings).toHaveBeenCalledWith('user-1', dto)
    expect(freelancerStrategy.updateNotificationSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ notifyNewOrders: true })
  })

  it('updates only FreelancerSettingsStrategy for a PROFESSIONAL without Commerce', async () => {
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: false, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })
    const dto = { notifyNewRequests: true } as UpdateNotificationSettingsDto

    const result = await service.updateNotificationSettings('user-2', dto)

    expect(freelancerStrategy.updateNotificationSettings).toHaveBeenCalledWith('user-2', dto)
    expect(commerceStrategy.updateNotificationSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ notifyNewRequests: true })
  })

  it('updates BOTH strategies for a hybrid PROFESSIONAL ("opción 2" + perfil profesional activo, ej. comidarapida@demo.com)', async () => {
    // Antes del fix, resolveStrategy() solo llamaba a CommerceSettingsStrategy
    // para este caso — notifyNewRequests/notifyRequestUpdates (solo existen en
    // FreelancerSettings) se perdían silenciosamente en cada guardado.
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: true, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })
    const dto = { notifyNewOrders: true, notifyNewRequests: true } as UpdateNotificationSettingsDto

    const result = await service.updateNotificationSettings('user-3', dto)

    expect(commerceStrategy.updateNotificationSettings).toHaveBeenCalledWith('user-3', dto)
    expect(freelancerStrategy.updateNotificationSettings).toHaveBeenCalledWith('user-3', dto)
    // El resultado devuelto al cliente es el de CommerceSettingsStrategy
    // (forma de `settings` para un híbrido, ver getSettings).
    expect(result).toEqual({ notifyNewOrders: true })
  })
})
