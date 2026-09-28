import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { CapabilitiesService } from '../../common/capabilities/capabilities.service'
import { CapabilityGuard } from '../../common/guards/capability.guard'

describe('CapabilitiesService', () => {
  const prisma = { user: { findUnique: jest.fn() } }
  const service = new CapabilitiesService(prisma as any)

  beforeEach(() => jest.clearAllMocks())

  it('evaluates each active profile separately (BUSINESS + PROFESSIONAL → both capabilities)', async () => {
    // AccountTypeResolver colapsa este caso a 'COMMERCE'; las capacidades no.
    prisma.user.findUnique.mockResolvedValue({
      commerce: { id: 'c1' },
      profiles: [{ type: 'BUSINESS' }, { type: 'PROFESSIONAL' }],
    })

    await expect(service.resolve('u1')).resolves.toEqual({
      HAS_COMMERCE: true,
      HAS_PROFESSIONAL_PROFILE: true,
      HAS_BUSINESS_PROFILE: true,
    })
  })

  it('a PROFESSIONAL selling product has HAS_COMMERCE without HAS_BUSINESS_PROFILE (opción 2)', async () => {
    prisma.user.findUnique.mockResolvedValue({ commerce: { id: 'c1' }, profiles: [{ type: 'PROFESSIONAL' }] })

    const caps = await service.resolve('u1')

    expect(caps.HAS_COMMERCE).toBe(true)
    expect(caps.HAS_BUSINESS_PROFILE).toBe(false)
  })

  it('returns all-false for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(service.resolve('ghost')).resolves.toEqual({
      HAS_COMMERCE: false,
      HAS_PROFESSIONAL_PROFILE: false,
      HAS_BUSINESS_PROFILE: false,
    })
  })
})

describe('CapabilityGuard', () => {
  const reflector = new Reflector()
  const capabilities = { resolve: jest.fn() }
  const guard = new CapabilityGuard(reflector, capabilities as any)
  const ctx = (user: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext

  beforeEach(() => jest.restoreAllMocks())

  it('skips when no capability is required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    await expect(guard.canActivate(ctx({ id: 'u1', role: 'PROFESIONAL' }))).resolves.toBe(true)
  })

  it('rejects when a required capability is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['HAS_COMMERCE'])
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: false, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })

    await expect(guard.canActivate(ctx({ id: 'u1', role: 'PROFESIONAL' }))).rejects.toThrow(ForbiddenException)
  })

  it('does NOT bypass SUPERADMIN: a capability is a fact about the data, not a permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['HAS_COMMERCE'])
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: false, HAS_PROFESSIONAL_PROFILE: false, HAS_BUSINESS_PROFILE: false })

    await expect(guard.canActivate(ctx({ id: 'admin', role: 'SUPERADMIN' }))).rejects.toThrow(ForbiddenException)
  })

  it('allows when every required capability is present', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['HAS_COMMERCE', 'HAS_PROFESSIONAL_PROFILE'])
    capabilities.resolve.mockResolvedValue({ HAS_COMMERCE: true, HAS_PROFESSIONAL_PROFILE: true, HAS_BUSINESS_PROFILE: false })

    await expect(guard.canActivate(ctx({ id: 'u1', role: 'PROFESIONAL' }))).resolves.toBe(true)
  })
})
