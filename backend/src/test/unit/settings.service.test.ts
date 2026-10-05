import { Test, TestingModule } from '@nestjs/testing'
import { SettingsService } from '../../domains/platform/settings/settings.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'
import { CapabilitiesService } from '../../common/capabilities/capabilities.service'
import { CommerceSettingsStrategy } from '../../domains/platform/settings/strategies/commerce-settings.strategy'
import { FreelancerSettingsStrategy } from '../../domains/platform/settings/strategies/freelancer-settings.strategy'

describe('SettingsService — resolveStrategy (getSettings)', () => {
  let service: SettingsService
  let capabilities: { has: jest.Mock }
  let commerceStrategy: { getSettings: jest.Mock }
  let freelancerStrategy: { getSettings: jest.Mock }

  beforeEach(async () => {
    capabilities = { has: jest.fn() }
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

  it('uses CommerceSettingsStrategy for a PROFESSIONAL with a Commerce ("opción 2", ej. categoría Comida)', async () => {
    // Caso real: comidarapida@demo.com — PROFESSIONAL/SERVICE_PROVIDER sin
    // perfil BUSINESS, pero con Commerce creado porque su categoría vende
    // producto físico. Antes de este fix, resolveStrategy() miraba accountType
    // (FREELANCER, porque no hay perfil BUSINESS) y nunca le devolvía
    // CommerceSettings (operaciones/price guard), aunque esos datos existieran.
    capabilities.has.mockResolvedValue(true)

    const result = await service.getSettings('user-1')

    expect(capabilities.has).toHaveBeenCalledWith('user-1', 'HAS_COMMERCE')
    expect(commerceStrategy.getSettings).toHaveBeenCalledWith('user-1')
    expect(freelancerStrategy.getSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ commerce: { id: 'c1' }, settings: { operations: {}, priceGuard: {} } })
  })

  it('uses FreelancerSettingsStrategy for a PROFESSIONAL without a Commerce', async () => {
    // Caso real: freelancer@demo.com — Diseño Gráfico, sin producto físico,
    // nunca tiene Commerce.
    capabilities.has.mockResolvedValue(false)

    const result = await service.getSettings('user-2')

    expect(capabilities.has).toHaveBeenCalledWith('user-2', 'HAS_COMMERCE')
    expect(freelancerStrategy.getSettings).toHaveBeenCalledWith('user-2')
    expect(commerceStrategy.getSettings).not.toHaveBeenCalled()
    expect(result).toEqual({ commerce: null, settings: { professionalName: 'x' } })
  })
})
